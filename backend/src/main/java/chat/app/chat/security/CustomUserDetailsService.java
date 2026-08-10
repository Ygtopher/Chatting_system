package chat.app.chat.security;

import chat.app.chat.model.User;
import chat.app.chat.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service("customUserDetailsService")
public class CustomUserDetailsService implements UserDetailsService {
    
    private static final Logger logger = LoggerFactory.getLogger(CustomUserDetailsService.class);
    
    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        logger.debug("Loading user details for email: {}", email);
        
        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> {
                        logger.error("User not found with email: {}", email);
                        return new UsernameNotFoundException("User not found with email: " + email);
                    });
            
            // Log the user details for debugging
            logger.info("Found user - Email: {}, Username: {}, Authorities: {}", 
                user.getEmail(), 
                user.getUsername(),
                user.getAuthorities());
                
            return user;
        } catch (Exception e) {
            logger.error("Error loading user by email {}: {}", email, e.getMessage());
            throw new UsernameNotFoundException("Error loading user: " + e.getMessage());
        }
    }
} 