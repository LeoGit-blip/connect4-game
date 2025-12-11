package com.connect4.service;

import com.connect4.exception.RoomFullException;
import com.connect4.exception.RoomNotFoundException;
import com.connect4.model.GameRoom;
import com.connect4.model.RoomConfig;
import com.connect4.model.RoomStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for managing multiplayer game rooms
 */
@Service
@Slf4j
public class RoomService {

    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();
    private final Random random = new Random();

    // Characters for room code generation (excluding confusing characters)
    private static final String ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int ROOM_CODE_LENGTH = 6;
    private static final long ROOM_TTL_HOURS = 1;

    /**
     * Creates a new game room with unique code
     */
    public GameRoom createRoom(String hostName, RoomConfig config) {
        String roomCode = generateRoomCode();

        Instant now = Instant.now();
        GameRoom room = GameRoom.builder()
                .roomCode(roomCode)
                .hostName(hostName)
                .config(config)
                .status(RoomStatus.WAITING)
                .createdAt(now)
                .lastActivityAt(now)
                .expiresAt(now.plus(ROOM_TTL_HOURS, ChronoUnit.HOURS))
                .build();

        rooms.put(roomCode, room);
        log.info("Created room {} for host {}", roomCode, hostName);

        return room;
    }

    /**
     * Joins an existing room
     */
    public GameRoom joinRoom(String roomCode, String guestName)
            throws RoomNotFoundException, RoomFullException {

        GameRoom room = rooms.get(roomCode);

        if (room == null) {
            throw new RoomNotFoundException("Room not found: " + roomCode);
        }

        if (room.getStatus() != RoomStatus.WAITING) {
            throw new RoomFullException("Room is full or game in progress");
        }

        room.setGuestName(guestName);
        room.setStatus(RoomStatus.READY);
        room.updateActivity();

        log.info("Guest {} joined room {}", guestName, roomCode);

        return room;
    }

    /**
     * Gets a room by code
     */
    public GameRoom getRoom(String roomCode) throws RoomNotFoundException {
        GameRoom room = rooms.get(roomCode);
        if (room == null) {
            throw new RoomNotFoundException("Room not found: " + roomCode);
        }
        return room;
    }

    /**
     * Updates room status
     */
    public void updateRoomStatus(String roomCode, RoomStatus status) {
        GameRoom room = getRoom(roomCode);
        room.setStatus(status);
        room.updateActivity();
        log.info("Room {} status updated to {}", roomCode, status);
    }

    /**
     * Removes a room
     */
    public void removeRoom(String roomCode) {
        rooms.remove(roomCode);
        log.info("Removed room {}", roomCode);
    }

    /**
     * Handles a player leaving a room
     * 
     * @return Result indicating if room was cancelled (HOST_LEFT) or just updated
     *         (GUEST_LEFT)
     */
    public LeaveRoomResult leaveRoom(String roomCode, String playerName) throws RoomNotFoundException {
        GameRoom room = getRoom(roomCode);

        if (playerName.equals(room.getHostName())) {
            // Host left - destroy room
            removeRoom(roomCode);
            return LeaveRoomResult.HOST_LEFT;
        } else if (playerName.equals(room.getGuestName())) {
            // Guest left - reset room to waiting
            room.setGuestName(null);
            room.setStatus(RoomStatus.WAITING);
            room.updateActivity();
            log.info("Guest {} left room {}", playerName, roomCode);
            return LeaveRoomResult.GUEST_LEFT;
        }

        return LeaveRoomResult.UNKNOWN;
    }

    public enum LeaveRoomResult {
        HOST_LEFT,
        GUEST_LEFT,
        UNKNOWN
    }

    /**
     * Generates unique 6-character room code
     */
    private String generateRoomCode() {
        StringBuilder code = new StringBuilder();

        do {
            code.setLength(0);
            for (int i = 0; i < ROOM_CODE_LENGTH; i++) {
                code.append(ROOM_CODE_CHARS.charAt(random.nextInt(ROOM_CODE_CHARS.length())));
            }
        } while (rooms.containsKey(code.toString()));

        return code.toString();
    }

    /**
     * Removes expired rooms - runs every 5 minutes
     */
    @Scheduled(fixedRate = 300000)
    public void cleanupExpiredRooms() {
        Instant now = Instant.now();
        int removedCount = 0;

        for (Map.Entry<String, GameRoom> entry : rooms.entrySet()) {
            GameRoom room = entry.getValue();
            if (room.getExpiresAt().isBefore(now)) {
                rooms.remove(entry.getKey());
                removedCount++;
                log.info("Removed expired room: {}", entry.getKey());
            }
        }

        if (removedCount > 0) {
            log.info("Cleanup completed: removed {} expired rooms", removedCount);
        }
    }

    /**
     * Get total number of active rooms
     */
    public int getActiveRoomCount() {
        return rooms.size();
    }
}
