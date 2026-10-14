package com.tcp.cleanmanagement.repository;

import com.tcp.cleanmanagement.entity.User;
import com.tcp.cleanmanagement.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    List<User> findAllByOrderByIdAsc();
    List<User> findByRoleOrderByIdAsc(Role role);
}
