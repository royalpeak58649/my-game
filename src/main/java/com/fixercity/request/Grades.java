package com.fixercity.request;

/** 해결사 등급 (9급 -> 1급)과 승급에 필요한 평판. */
public final class Grades {
    /** index = 등급. REQUIRED[8] = 8급에 필요한 평판. */
    private static final int[] REQUIRED = {0, 16000, 10000, 6000, 3000, 1500, 700, 300, 100, 0};

    private Grades() {}

    public static int gradeFor(int rep) {
        for (int g = 1; g <= 9; g++) {
            if (rep >= REQUIRED[g]) {
                return g;
            }
        }
        return 9;
    }

    /** 다음 등급에 필요한 평판. 1급이면 -1. */
    public static int nextThreshold(int grade) {
        return grade <= 1 ? -1 : REQUIRED[grade - 1];
    }

    /** 의뢰 보수 (안). */
    public static int baseAhn(int grade) {
        return switch (grade) {
            case 9 -> 100;
            case 8 -> 180;
            case 7 -> 320;
            case 6 -> 560;
            case 5 -> 1000;
            case 4 -> 1800;
            case 3 -> 3200;
            case 2 -> 5500;
            default -> 9000;
        };
    }

    /** 의뢰 평판 보상. */
    public static int baseRep(int grade) {
        return switch (grade) {
            case 9 -> 20;
            case 8 -> 35;
            case 7 -> 60;
            case 6 -> 100;
            case 5 -> 170;
            case 4 -> 280;
            case 3 -> 450;
            case 2 -> 700;
            default -> 1000;
        };
    }
}
