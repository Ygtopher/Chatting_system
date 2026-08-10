package chat.app.chat.security;

import chat.app.chat.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtTokenUtil {
    private static final Logger logger = LoggerFactory.getLogger(JwtTokenUtil.class);

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    private Key getSigningKey() {
        byte[] keyBytes = secret.getBytes();
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String extractUsername(String token) {
        logger.info("Extracting username from token");
        String username = extractClaim(token, Claims::getSubject);
        logger.info("Extracted username: {}", username);
        return username;
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        String subject = (userDetails instanceof User) ? ((User) userDetails).getEmail() : userDetails.getUsername();
        return createToken(claims, subject);
    }

    private String createToken(Map<String, Object> claims, String subject) {
        logger.info("Creating token for subject: {}", subject);
        Date now = new Date();
        // jwt.expiration is in milliseconds (86400000 = 24h)
        Date expiryDate = new Date(now.getTime() + (expiration > 1000000L ? expiration : expiration * 1000L));
        
        String token = Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS512)
                .compact();
        
        logger.info("Generated token with expiry: {}", expiryDate);
        return token;
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        try {
            final String extractedEmail = extractUsername(token);
            String targetEmail = (userDetails instanceof User) ? ((User) userDetails).getEmail() : userDetails.getUsername();
            logger.info("Validating token for user email: {}", targetEmail);
            boolean isValid = extractedEmail.equals(targetEmail) && !isTokenExpired(token);
            
            if (isValid) {
                logger.info("Token validation successful for email: {}", extractedEmail);
            } else {
                if (!extractedEmail.equals(targetEmail)) {
                    logger.warn("Token email mismatch. Expected: {}, Actual: {}", targetEmail, extractedEmail);
                }
                if (isTokenExpired(token)) {
                    logger.warn("Token has expired");
                }
            }
            
            return isValid;
        } catch (Exception e) {
            logger.error("Error validating token: {}", e.getMessage(), e);
            return false;
        }
    }
} 