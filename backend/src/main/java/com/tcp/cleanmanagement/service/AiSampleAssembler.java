package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.dto.AiSample;
import com.tcp.cleanmanagement.enums.MetricCode;
import com.tcp.cleanmanagement.enums.SensorModel;
import com.tcp.cleanmanagement.repository.AiRawPoint;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Component
public class AiSampleAssembler {
    public List<AiSample> assemble(List<AiRawPoint> points, LocalDateTime endExclusive) {
        Map<Long, Bucket> buckets = new TreeMap<>();
        for (AiRawPoint point : points) {
            if (!point.measuredAt().isBefore(endExclusive)) continue;
            long bucket = Math.floorDiv(point.measuredAt().toEpochSecond(ZoneOffset.UTC), 15) * 15;
            buckets.computeIfAbsent(bucket, k -> new Bucket()).add(point);
        }
        // Only a contiguous suffix ending at the last closed interval is valid.
        // Missing required readings restart warmup; gaps never become fabricated rows.
        LinkedList<AiSample> samples = new LinkedList<>();
        long at = endExclusive.toEpochSecond(ZoneOffset.UTC) - 15;
        while (samples.size() < 2400) {
            Bucket bucket = buckets.get(at);
            if (bucket == null || !bucket.complete()) break;
            samples.addFirst(bucket.sample(at));
            at -= 15;
        }
        return samples;
    }

    private static class Bucket {
        Double temperature, humidity, mq7;
        List<Double> mq135 = new ArrayList<>();
        boolean invalid;

        void add(AiRawPoint point) {
            double value = point.value().doubleValue();
            if (point.metricCode() == MetricCode.TEMPERATURE && point.sensorModel() == SensorModel.DHT22) {
                temperature = value;
                invalid |= !Double.isFinite(value) || value < -40 || value > 80;
            } else if (point.metricCode() == MetricCode.HUMIDITY && point.sensorModel() == SensorModel.DHT22) {
                humidity = value;
                invalid |= !Double.isFinite(value) || value < 0 || value > 100;
            } else if (point.metricCode() == MetricCode.GAS && point.sensorModel() == SensorModel.MQ135) {
                mq135.add(value);
                invalid |= !Double.isFinite(value) || value < 0 || value > 4095;
            } else if (point.metricCode() == MetricCode.GAS && point.sensorModel() == SensorModel.MQ7
                    && Boolean.TRUE.equals(point.heaterPhaseValid())) {
                if (Double.isFinite(value) && value >= 0 && value <= 4095) mq7 = value;
            }
        }

        boolean complete() {
            return !invalid && temperature != null && humidity != null && !mq135.isEmpty();
        }

        AiSample sample(long at) {
            mq135.sort(Double::compareTo);
            int middle = mq135.size() / 2;
            double median = mq135.size() % 2 == 1 ? mq135.get(middle)
                    : (mq135.get(middle - 1) + mq135.get(middle)) / 2;
            return new AiSample(LocalDateTime.ofEpochSecond(at, 0, ZoneOffset.UTC).atOffset(ZoneOffset.UTC),
                    temperature, humidity, median, mq7);
        }
    }
}
