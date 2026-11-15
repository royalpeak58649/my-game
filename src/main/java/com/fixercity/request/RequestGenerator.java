package com.fixercity.request;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.BlockPos;
import net.minecraft.util.RandomSource;

/** 등급에 맞는 의뢰를 무작위로 만든다. */
public final class RequestGenerator {
    private record Entry(String id, int count) {}

    private RequestGenerator() {}

    private static List<Entry> exterminationTargets(int grade) {
        return switch (grade) {
            case 9 -> List.of(e("zombie", 8), e("spider", 6), e("skeleton", 5));
            case 8 -> List.of(e("zombie", 14), e("skeleton", 10), e("spider", 10), e("drowned", 6));
            case 7 -> List.of(e("creeper", 6), e("witch", 2), e("husk", 8), e("stray", 8));
            case 6 -> List.of(e("pillager", 6), e("enderman", 3), e("phantom", 4), e("slime", 8));
            case 5 -> List.of(e("blaze", 6), e("vindicator", 4), e("magma_cube", 8), e("ghast", 2));
            case 4 -> List.of(e("wither_skeleton", 5), e("piglin_brute", 2), e("guardian", 6), e("evoker", 1));
            case 3 -> List.of(e("ravager", 2), e("evoker", 2), e("piglin_brute", 4), e("wither_skeleton", 10));
            default -> List.of(e("elder_guardian", 1), e("ravager", 4), e("evoker", 4));
        };
    }

    private static List<Entry> deliveryTargets(int grade) {
        return switch (grade) {
            case 9 -> List.of(e("leather", 8), e("wheat", 32), e("cobblestone", 64), e("bread", 16));
            case 8 -> List.of(e("iron_ingot", 12), e("coal", 32), e("string", 16));
            case 7 -> List.of(e("gunpowder", 12), e("gold_ingot", 8), e("ender_pearl", 4));
            case 6 -> List.of(e("diamond", 2), e("redstone", 48), e("lapis_lazuli", 32), e("blaze_rod", 4));
            case 5 -> List.of(e("diamond", 5), e("blaze_rod", 10), e("emerald", 10));
            case 4 -> List.of(e("diamond", 10), e("ghast_tear", 3), e("obsidian", 32));
            case 3 -> List.of(e("netherite_scrap", 2), e("diamond", 16));
            default -> List.of(e("netherite_ingot", 1), e("nether_star", 1));
        };
    }

    /** 현상범 조직과 나오는 의뢰 등급 범위 (최고 등급, 최저 등급). 원작 접대 등급 기준. */
    private static final String[][] BOUNTY_RANGES = {
            {"rat", "7", "9"}, {"yun", "7", "9"}, {"hook", "6", "8"}, {"office_fixer", "6", "8"},
            {"streetlight", "6", "7"}, {"zwei", "4", "6"}, {"molar", "4", "6"},
            {"kurokumo", "3", "5"}, {"full_stop", "3", "5"}, {"dawn", "3", "5"}, {"gaze", "3", "5"},
            {"wedge", "3", "5"}, {"workshop", "3", "5"}, {"jeong", "3", "5"},
            {"shi", "2", "4"}, {"seven", "2", "4"}, {"w_corp", "2", "4"}, {"warp", "2", "4"}, {"smiling", "2", "4"},
            {"index", "2", "4"}, {"philip", "2", "4"}, {"liu", "1", "3"}, {"thumb", "1", "3"}};

    /** 현상범 조직: 등급 범위에 맞는 것 중에서 고른다. */
    private static List<String> bountyFactions(int grade) {
        List<String> list = new ArrayList<>();
        for (String[] r : BOUNTY_RANGES) {
            if (grade >= Integer.parseInt(r[1]) && grade <= Integer.parseInt(r[2])) {
                list.add(r[0]);
            }
        }
        if (list.isEmpty()) {
            list.add("thumb");
        }
        return list;
    }

    private static Entry e(String id, int count) {
        return new Entry("minecraft:" + id, count);
    }

    public static Request generate(RandomSource random, int id, int grade, BlockPos origin, String dimension) {
        Request r = new Request();
        r.id = id;
        r.grade = Math.max(1, Math.min(9, grade));
        r.dimension = dimension;

        // 의뢰 종류 가중치 (조사는 7~9급만)
        int[] weights = {22, 18, 12, r.grade >= 7 ? 8 : 0, 10, 12, 10, 8};
        RequestType[] types = {RequestType.EXTERMINATION, RequestType.BOUNTY, RequestType.DELIVERY, RequestType.INVESTIGATION,
                RequestType.ESCORT, RequestType.DEFENSE, RequestType.RETRIEVAL, RequestType.PATROL};
        int total = 0;
        for (int w : weights) {
            total += w;
        }
        int roll = random.nextInt(total);
        r.type = RequestType.EXTERMINATION;
        for (int i = 0; i < types.length; i++) {
            roll -= weights[i];
            if (roll < 0) {
                r.type = types[i];
                break;
            }
        }

        switch (r.type) {
            case EXTERMINATION -> {
                List<Entry> list = exterminationTargets(r.grade);
                Entry entry = list.get(random.nextInt(list.size()));
                r.target = entry.id();
                r.count = entry.count();
            }
            case DELIVERY -> {
                List<Entry> list = deliveryTargets(r.grade);
                Entry entry = list.get(random.nextInt(list.size()));
                r.target = entry.id();
                r.count = entry.count();
            }
            case BOUNTY -> {
                List<String> factions = bountyFactions(r.grade);
                r.target = factions.get(random.nextInt(factions.size()));
                r.count = 1;
                r.pos = offset(random, origin, 200, 450);
            }
            case INVESTIGATION -> {
                r.count = 1;
                r.pos = offset(random, origin, 150, 350);
            }
            case ESCORT -> {
                r.count = 1;
                r.pos = offset(random, origin, 120, 260);
            }
            case DEFENSE -> {
                r.count = 3;
                r.pos = offset(random, origin, 60, 160);
            }
            case RETRIEVAL -> {
                r.count = 1;
                r.pos = offset(random, origin, 150, 350);
            }
            case PATROL -> {
                r.count = 3;
                double base = random.nextDouble() * Math.PI * 2;
                for (int i = 0; i < 3; i++) {
                    double a = base + i * (Math.PI * 2 / 3);
                    int d = 60 + random.nextInt(80);
                    r.waypoints.add(new BlockPos(origin.getX() + (int) (Math.cos(a) * d), 64, origin.getZ() + (int) (Math.sin(a) * d)));
                }
                r.pos = r.waypoints.get(0);
            }
        }

        float jitter = 0.85F + random.nextFloat() * 0.3F;
        r.rewardAhn = Math.round(Grades.baseAhn(r.grade) * r.type.rewardMultiplier() * jitter / 10.0F) * 10;
        r.rewardRep = Math.round(Grades.baseRep(r.grade) * r.type.rewardMultiplier());
        return r;
    }

    private static BlockPos offset(RandomSource random, BlockPos origin, int min, int max) {
        double angle = random.nextDouble() * Math.PI * 2;
        int dist = min + random.nextInt(max - min);
        return new BlockPos(origin.getX() + (int) (Math.cos(angle) * dist), 64, origin.getZ() + (int) (Math.sin(angle) * dist));
    }
}
