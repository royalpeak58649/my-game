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

    /** 현상범 조직: 등급 범위에 맞는 것 중에서 고른다. */
    private static List<String> bountyFactions(int grade) {
        List<String> list = new ArrayList<>();
        if (grade >= 7) list.add("rat");
        if (grade >= 6 && grade <= 8) list.add("office_fixer");
        if (grade >= 4 && grade <= 6) {
            list.add("zwei");
            list.add("liu");
            list.add("seven");
        }
        if (grade >= 3 && grade <= 6) list.add("shi");
        if (grade <= 5) {
            list.add("thumb");
            list.add("kurokumo");
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

        int roll = random.nextInt(100);
        boolean allowInvestigation = r.grade >= 7;
        if (roll < 40) {
            r.type = RequestType.EXTERMINATION;
        } else if (roll < 65) {
            r.type = RequestType.BOUNTY;
        } else if (roll < 85 || !allowInvestigation) {
            r.type = RequestType.DELIVERY;
        } else {
            r.type = RequestType.INVESTIGATION;
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
