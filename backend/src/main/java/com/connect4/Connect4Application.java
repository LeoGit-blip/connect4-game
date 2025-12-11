package com.connect4;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class Connect4Application {
    public static void main(String[] args) {
        SpringApplication.run(Connect4Application.class, args);
    }
}
