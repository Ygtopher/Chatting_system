package chat.app.chat.service;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory JWT token blocklist for logout invalidation.
 * Tokens are added here on logout and checked in JwtRequestFilter.
 * Note: resets on server restart. For persistence, swap with a Redis-backed store.
 */
@Service
public class TokenBlocklistService {

    private final Set<String> blocklist = Collections.newSetFromMap(new ConcurrentHashMap<>());

    public void block(String token) {
        blocklist.add(token);
    }

    public boolean isBlocklisted(String token) {
        return blocklist.contains(token);
    }
}
