/**
 * UTC 날짜 문자열을 KST(한국 표준시) 형식으로 변환합니다.
 */
export function formatToKst(dateStr, includeDate = true) {
  if (!dateStr) return '-';
  try {
    const utcDate = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (isNaN(utcDate.getTime())) {
      const fallback = new Date(dateStr);
      if (isNaN(fallback.getTime())) return dateStr;
      return includeDate ? fallback.toLocaleString('ko-KR') : fallback.toLocaleTimeString('ko-KR');
    }
    
    if (includeDate) {
      return utcDate.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } else {
      return utcDate.toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }
  } catch (e) {
    return dateStr;
  }
}

/**
 * 센서 수치 및 소수점 자리수를 예쁘게 포맷팅합니다.
 */
export function formatMetricValue(value, decimals = 1) {
  if (value === null || value === undefined) return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toFixed(decimals);
}
