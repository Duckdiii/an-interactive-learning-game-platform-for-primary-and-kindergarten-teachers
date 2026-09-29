package com.aigameplatform.backend.security;

import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.repository.TeacherRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class TeacherUserDetailsService implements UserDetailsService {

    private final TeacherRepository teacherRepository;

    public TeacherUserDetailsService(TeacherRepository teacherRepository) {
        this.teacherRepository = teacherRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Teacher teacher = teacherRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy giáo viên: " + email));
        return User.withUsername(teacher.getEmail())
                .password(teacher.getPasswordHash())
                .authorities(new String[0])
                .build();
    }
}
