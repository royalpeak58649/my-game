package com.fixercity.keypage;

import static com.fixercity.keypage.Resist.ENDURE;
import static com.fixercity.keypage.Resist.FATAL;
import static com.fixercity.keypage.Resist.NORMAL;
import static com.fixercity.keypage.Resist.WEAK;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 모든 책장 목록. 수치는 이 모드의 밸런스용 오리지널 값이다. */
public final class KeyPages {
    /** 책장을 끼지 않았을 때의 흐트러짐 저항. */
    public static final float BARE_STAGGER = 20.0F;

    //                     id            급  체력  흐트  속도   방어 | 체력 내성: 참 관 타 | 흐트 내성: 참 관 타 | 패시브 | 모자
    public static final KeyPage RAT = new KeyPage("rat", 9, 0, 16, 0.05F, 0,
            WEAK, WEAK, NORMAL, NORMAL, WEAK, WEAK, KeyPagePassive.SCRAMBLE, false);
    public static final KeyPage OFFICE_FIXER = new KeyPage("office_fixer", 8, 4, 22, 0.0F, 2,
            NORMAL, NORMAL, NORMAL, NORMAL, NORMAL, NORMAL, KeyPagePassive.DISCIPLINE, true);
    public static final KeyPage ZWEI = new KeyPage("zwei", 6, 10, 30, -0.05F, 6,
            ENDURE, NORMAL, ENDURE, ENDURE, NORMAL, WEAK, KeyPagePassive.GUARD, false);
    public static final KeyPage SHI = new KeyPage("shi", 4, 6, 26, 0.15F, 4,
            NORMAL, WEAK, WEAK, WEAK, NORMAL, FATAL, KeyPagePassive.FIRST_STRIKE, false);
    public static final KeyPage LIU = new KeyPage("liu", 3, 12, 34, 0.05F, 7,
            NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, WEAK, KeyPagePassive.BLAZE, false);
    public static final KeyPage SEVEN = new KeyPage("seven", 4, 8, 32, 0.0F, 5,
            NORMAL, NORMAL, WEAK, ENDURE, ENDURE, NORMAL, KeyPagePassive.ANALYSIS, true);
    public static final KeyPage THUMB = new KeyPage("thumb", 3, 12, 32, 0.0F, 8,
            WEAK, ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, KeyPagePassive.MARKSMAN, true);
    public static final KeyPage KUROKUMO = new KeyPage("kurokumo", 5, 6, 24, 0.10F, 3,
            ENDURE, WEAK, NORMAL, ENDURE, NORMAL, WEAK, KeyPagePassive.BLEED, false);

    // ---- 원작 접대 기준: 카나드 ~ 도시 질병의 해결사들 ----
    public static final KeyPage YUN = new KeyPage("yun", 8, 4, 22, 0.0F, 2,
            NORMAL, WEAK, NORMAL, NORMAL, NORMAL, WEAK, KeyPagePassive.PACK, false);
    public static final KeyPage HOOK = new KeyPage("hook", 8, 2, 20, 0.05F, 2,
            NORMAL, NORMAL, WEAK, WEAK, NORMAL, NORMAL, KeyPagePassive.HUNTER, false);
    public static final KeyPage STREETLIGHT = new KeyPage("streetlight", 7, 6, 24, 0.0F, 3,
            NORMAL, NORMAL, NORMAL, NORMAL, ENDURE, WEAK, KeyPagePassive.BOND, false);
    public static final KeyPage MOLAR = new KeyPage("molar", 6, 8, 28, 0.0F, 5,
            ENDURE, NORMAL, NORMAL, NORMAL, NORMAL, WEAK, KeyPagePassive.COORDINATION, false);
    public static final KeyPage FULL_STOP = new KeyPage("full_stop", 5, 6, 24, 0.05F, 3,
            WEAK, NORMAL, NORMAL, NORMAL, ENDURE, NORMAL, KeyPagePassive.STEADY_AIM, true);
    public static final KeyPage DAWN = new KeyPage("dawn", 5, 10, 30, 0.0F, 5,
            NORMAL, ENDURE, NORMAL, ENDURE, NORMAL, NORMAL, KeyPagePassive.DAWN, false);
    public static final KeyPage GAZE = new KeyPage("gaze", 5, 8, 28, 0.0F, 4,
            NORMAL, NORMAL, ENDURE, ENDURE, WEAK, NORMAL, KeyPagePassive.GAZE, true);
    public static final KeyPage WEDGE = new KeyPage("wedge", 5, 8, 26, 0.05F, 4,
            ENDURE, WEAK, NORMAL, NORMAL, NORMAL, ENDURE, KeyPagePassive.WEDGE, false);
    public static final KeyPage WORKSHOP = new KeyPage("workshop", 5, 8, 28, 0.0F, 6,
            NORMAL, ENDURE, ENDURE, NORMAL, WEAK, NORMAL, KeyPagePassive.WORKSHOP, false);
    public static final KeyPage JEONG = new KeyPage("jeong", 5, 6, 26, 0.10F, 3,
            ENDURE, NORMAL, WEAK, ENDURE, NORMAL, NORMAL, KeyPagePassive.COUNTER, false);

    // ---- 도시 악몽 ----
    public static final KeyPage W_CORP = new KeyPage("w_corp", 4, 8, 30, 0.05F, 5,
            NORMAL, ENDURE, NORMAL, NORMAL, NORMAL, WEAK, KeyPagePassive.CHARGE, true);
    public static final KeyPage WARP = new KeyPage("warp", 4, 6, 28, 0.10F, 4,
            ENDURE, NORMAL, WEAK, ENDURE, NORMAL, NORMAL, KeyPagePassive.BLINK, false);
    public static final KeyPage SMILING = new KeyPage("smiling", 4, 14, 26, 0.0F, 3,
            WEAK, ENDURE, ENDURE, NORMAL, ENDURE, NORMAL, KeyPagePassive.DEVOUR, false);
    public static final KeyPage INDEX = new KeyPage("index", 4, 8, 30, 0.05F, 5,
            NORMAL, NORMAL, NORMAL, ENDURE, ENDURE, NORMAL, KeyPagePassive.PRESCRIPT, false);
    public static final KeyPage PHILIP = new KeyPage("philip", 4, 10, 30, 0.05F, 4,
            NORMAL, NORMAL, ENDURE, NORMAL, WEAK, ENDURE, KeyPagePassive.BURNING_EMOTION, false);

    // ---- 도시의 별 · 하나 협회 (원작 책장 수치를 환산) ----
    public static final KeyPage DONG_HWAN = new KeyPage("dong_hwan", 1, 15, 31, 0.05F, 7,
            NORMAL, ENDURE, NORMAL, ENDURE, NORMAL, NORMAL, KeyPagePassive.DONG_HWAN, false);
    public static final KeyPage LOWELL = new KeyPage("lowell", 2, 18, 35, 0.09F, 6,
            NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, KeyPagePassive.LOWELL, false);
    public static final KeyPage CECIL = new KeyPage("cecil", 2, 16, 32, 0.05F, 6,
            NORMAL, ENDURE, NORMAL, ENDURE, NORMAL, NORMAL, KeyPagePassive.CECIL, false);
    public static final KeyPage MEI = new KeyPage("mei", 2, 16, 32, 0.05F, 6,
            NORMAL, ENDURE, NORMAL, ENDURE, NORMAL, NORMAL, KeyPagePassive.MEI, false);
    public static final KeyPage KALO = new KeyPage("kalo", 2, 18, 36, 0.09F, 6,
            NORMAL, NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, KeyPagePassive.KALO, true);
    public static final KeyPage BORIS = new KeyPage("boris", 2, 16, 34, 0.05F, 6,
            NORMAL, NORMAL, ENDURE, NORMAL, ENDURE, NORMAL, KeyPagePassive.BORIS, false);
    public static final KeyPage KATRIEL = new KeyPage("katriel", 2, 16, 32, 0.05F, 6,
            NORMAL, ENDURE, NORMAL, NORMAL, NORMAL, NORMAL, KeyPagePassive.KATRIEL, false);
    public static final KeyPage DENIS = new KeyPage("denis", 2, 16, 32, 0.05F, 6,
            ENDURE, NORMAL, NORMAL, NORMAL, NORMAL, NORMAL, KeyPagePassive.DENIS, false);
    public static final KeyPage NEMO = new KeyPage("nemo", 2, 18, 36, 0.12F, 6,
            ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, NORMAL, KeyPagePassive.NEMO, false);
    public static final KeyPage MARTINA = new KeyPage("martina", 2, 15, 33, 0.05F, 6,
            NORMAL, NORMAL, ENDURE, NORMAL, NORMAL, NORMAL, KeyPagePassive.MARTINA, false);
    public static final KeyPage BADA = new KeyPage("bada", 2, 16, 32, 0.05F, 6,
            NORMAL, NORMAL, ENDURE, NORMAL, NORMAL, NORMAL, KeyPagePassive.BADA, false);
    public static final KeyPage ESTHER = new KeyPage("esther", 2, 20, 36, 0.09F, 6,
            NORMAL, NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, KeyPagePassive.ESTHER, false);
    public static final KeyPage HUBERT = new KeyPage("hubert", 2, 20, 36, 0.12F, 6,
            NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, KeyPagePassive.HUBERT, false);
    public static final KeyPage GLORIA = new KeyPage("gloria", 2, 20, 36, 0.09F, 6,
            ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, NORMAL, KeyPagePassive.GLORIA, false);
    public static final KeyPage CHUN = new KeyPage("chun", 2, 18, 34, 0.09F, 6,
            NORMAL, NORMAL, ENDURE, NORMAL, ENDURE, NORMAL, KeyPagePassive.CHUN, false);
    public static final KeyPage XIAO = new KeyPage("xiao", 1, 20, 39, 0.09F, 7,
            ENDURE, NORMAL, NORMAL, NORMAL, NORMAL, ENDURE, KeyPagePassive.XIAO, false);
    public static final KeyPage MIRIS = new KeyPage("miris", 2, 18, 33, 0.09F, 6,
            ENDURE, NORMAL, NORMAL, NORMAL, NORMAL, ENDURE, KeyPagePassive.MIRIS, false);
    public static final KeyPage RED_MIST = new KeyPage("red_mist", 1, 22, 38, 0.09F, 8,
            NORMAL, NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, KeyPagePassive.RED_MIST, false);
    public static final KeyPage NIKOLAI = new KeyPage("nikolai", 1, 20, 36, 0.09F, 7,
            NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, KeyPagePassive.NIKOLAI, true);
    public static final KeyPage MYO = new KeyPage("myo", 2, 20, 36, 0.09F, 6,
            ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, NORMAL, KeyPagePassive.MYO, false);
    public static final KeyPage MAXIM = new KeyPage("maxim", 2, 22, 35, 0.09F, 6,
            NORMAL, NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, KeyPagePassive.MAXIM, false);
    public static final KeyPage RUDOLPH = new KeyPage("rudolph", 2, 20, 36, 0.09F, 6,
            NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, KeyPagePassive.RUDOLPH, false);
    public static final KeyPage PURPLE_TEAR = new KeyPage("purple_tear", 1, 21, 36, 0.09F, 8,
            ENDURE, NORMAL, NORMAL, NORMAL, NORMAL, ENDURE, KeyPagePassive.PURPLE_TEAR, false);
    public static final KeyPage YAN = new KeyPage("yan", 1, 21, 37, 0.09F, 7,
            NORMAL, NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, KeyPagePassive.YAN, false);
    public static final KeyPage ALLEN = new KeyPage("allen", 1, 18, 33, 0.09F, 7,
            NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, KeyPagePassive.ALLEN, false);
    public static final KeyPage IRINA = new KeyPage("irina", 1, 18, 39, 0.05F, 7,
            ENDURE, NORMAL, ENDURE, NORMAL, NORMAL, NORMAL, KeyPagePassive.IRINA, false);
    public static final KeyPage YAE = new KeyPage("yae", 1, 18, 34, 0.05F, 7,
            NORMAL, ENDURE, NORMAL, ENDURE, NORMAL, NORMAL, KeyPagePassive.YAE, false);
    public static final KeyPage BAYARD = new KeyPage("bayard", 1, 18, 33, 0.05F, 7,
            ENDURE, NORMAL, ENDURE, NORMAL, NORMAL, NORMAL, KeyPagePassive.BAYARD, false);
    public static final KeyPage HANA_FIXER = new KeyPage("hana_fixer", 2, 19, 34, 0.09F, 6,
            NORMAL, ENDURE, NORMAL, NORMAL, NORMAL, ENDURE, KeyPagePassive.HANA_FIXER, false);
    public static final KeyPage MIRINAE = new KeyPage("mirinae", 1, 21, 35, 0.09F, 7,
            ENDURE, NORMAL, NORMAL, NORMAL, ENDURE, NORMAL, KeyPagePassive.MIRINAE, false);
    public static final KeyPage HAROLD = new KeyPage("harold", 1, 21, 35, 0.09F, 7,
            NORMAL, NORMAL, ENDURE, ENDURE, NORMAL, NORMAL, KeyPagePassive.HAROLD, false);
    public static final KeyPage OLIVIER = new KeyPage("olivier", 1, 22, 37, 0.09F, 7,
            NORMAL, NORMAL, ENDURE, ENDURE, NORMAL, NORMAL, KeyPagePassive.OLIVIER, false);

    // ---- 접대 손님 (L_Ender's Cataclysm 보스) ----
    // 손님을 이기면 그 손님의 책을 얻고, 공방에서 빈 책장과 함께 제본하면 이 책장이 된다.
    // 접대 중인 손님 자신도 이 책장의 내성을 쓴다.
    public static final KeyPage AMETHYST_CRAB = new KeyPage("amethyst_crab", 9, 2, 18, 0.0F, 3,
            ENDURE, NORMAL, WEAK, NORMAL, NORMAL, WEAK, KeyPagePassive.AMETHYST_SHELL, false);
    public static final KeyPage KOBOLEDIATOR = new KeyPage("kobolediator", 8, 4, 22, 0.05F, 2,
            NORMAL, WEAK, NORMAL, NORMAL, WEAK, NORMAL, KeyPagePassive.ARENA_ROAR, true);
    public static final KeyPage PROWLER = new KeyPage("prowler", 7, 6, 24, 0.05F, 4,
            ENDURE, ENDURE, WEAK, NORMAL, NORMAL, WEAK, KeyPagePassive.TRACKING, true);
    public static final KeyPage CORALSSUS = new KeyPage("coralssus", 7, 8, 26, -0.05F, 4,
            NORMAL, ENDURE, NORMAL, WEAK, ENDURE, NORMAL, KeyPagePassive.CORAL_ARMOR, false);
    public static final KeyPage WADJET = new KeyPage("wadjet", 6, 6, 26, 0.10F, 3,
            ENDURE, NORMAL, WEAK, NORMAL, ENDURE, WEAK, KeyPagePassive.VIPER_GAZE, true);
    public static final KeyPage ENDER_GOLEM = new KeyPage("ender_golem", 6, 12, 30, -0.05F, 6,
            NORMAL, ENDURE, ENDURE, NORMAL, ENDURE, NORMAL, KeyPagePassive.VOID_FIST, false);
    public static final KeyPage APTRGANGR = new KeyPage("aptrgangr", 5, 10, 28, 0.0F, 5,
            WEAK, ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, KeyPagePassive.UNDYING, true);
    public static final KeyPage NETHERITE_MONSTROSITY = new KeyPage("netherite_monstrosity", 4, 14, 32, -0.05F, 8,
            ENDURE, ENDURE, NORMAL, NORMAL, ENDURE, WEAK, KeyPagePassive.LAVA_HEART, false);
    public static final KeyPage ANCIENT_REMNANT = new KeyPage("ancient_remnant", 4, 12, 30, 0.05F, 6,
            NORMAL, ENDURE, ENDURE, ENDURE, NORMAL, NORMAL, KeyPagePassive.DESERT_KING, true);
    public static final KeyPage ENDER_GUARDIAN = new KeyPage("ender_guardian", 3, 13, 33, 0.05F, 7,
            ENDURE, NORMAL, ENDURE, NORMAL, ENDURE, NORMAL, KeyPagePassive.VOID_RUNE, true);
    public static final KeyPage MALEDICTUS = new KeyPage("maledictus", 3, 12, 33, 0.10F, 6,
            NORMAL, ENDURE, NORMAL, ENDURE, NORMAL, WEAK, KeyPagePassive.GRUDGE, true);
    public static final KeyPage LEVIATHAN = new KeyPage("leviathan", 2, 18, 35, 0.05F, 6,
            ENDURE, NORMAL, ENDURE, NORMAL, ENDURE, NORMAL, KeyPagePassive.ABYSSAL_HUNTER, false);
    public static final KeyPage SCYLLA = new KeyPage("scylla", 2, 17, 34, 0.09F, 6,
            NORMAL, ENDURE, ENDURE, ENDURE, NORMAL, NORMAL, KeyPagePassive.STORM_CHAIN, true);
    public static final KeyPage IGNIS = new KeyPage("ignis", 2, 18, 36, 0.05F, 7,
            ENDURE, NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, KeyPagePassive.HELLFIRE, true);
    public static final KeyPage HARBINGER = new KeyPage("harbinger", 1, 21, 38, 0.09F, 8,
            ENDURE, ENDURE, NORMAL, ENDURE, NORMAL, NORMAL, KeyPagePassive.HERALD_LASER, true);

    /** 접대 손님 책장 (상점·키트에는 없고 제본으로만 얻는다). */
    public static final List<KeyPage> GUESTS = List.of(AMETHYST_CRAB, KOBOLEDIATOR, PROWLER, CORALSSUS, WADJET, ENDER_GOLEM,
            APTRGANGR, NETHERITE_MONSTROSITY, ANCIENT_REMNANT, ENDER_GUARDIAN, MALEDICTUS, LEVIATHAN, SCYLLA, IGNIS, HARBINGER);

    public static final List<KeyPage> ALL = concat(List.of(RAT, OFFICE_FIXER, ZWEI, SHI, LIU, SEVEN, THUMB, KUROKUMO,
            YUN, HOOK, STREETLIGHT, MOLAR, FULL_STOP, DAWN, GAZE, WEDGE, WORKSHOP, JEONG,
            W_CORP, WARP, SMILING, INDEX, PHILIP,
            DONG_HWAN, LOWELL, CECIL, MEI, KALO, BORIS, KATRIEL, DENIS, NEMO, MARTINA, BADA, ESTHER, HUBERT, GLORIA, CHUN, XIAO, MIRIS, RED_MIST, NIKOLAI, MYO, MAXIM, RUDOLPH, PURPLE_TEAR, YAN, ALLEN, IRINA, YAE, BAYARD, HANA_FIXER, MIRINAE, HAROLD, OLIVIER), GUESTS);

    private static final Map<String, KeyPage> BY_ID = new LinkedHashMap<>();

    static {
        for (KeyPage page : ALL) {
            BY_ID.put(page.id(), page);
        }
    }

    /** id로 책장을 찾는다. 없거나 빈 문자열이면 null. */
    public static KeyPage byId(String id) {
        return id == null || id.isEmpty() ? null : BY_ID.get(id);
    }

    public static boolean isGuest(KeyPage page) {
        return page != null && GUESTS.contains(page);
    }

    private static List<KeyPage> concat(List<KeyPage> a, List<KeyPage> b) {
        java.util.ArrayList<KeyPage> out = new java.util.ArrayList<>(a);
        out.addAll(b);
        return List.copyOf(out);
    }

    private KeyPages() {}
}
