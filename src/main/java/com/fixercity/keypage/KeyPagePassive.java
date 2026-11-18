package com.fixercity.keypage;

/** 책장 고유 패시브. 실제 효과는 CombatHandler / FixerEvents에서 처리. */
public enum KeyPagePassive {
    /** 쥐: 체력 30% 이하일 때 신속 II. */
    SCRAMBLE("scramble"),
    /** 사무소 해결사: 모든 공격 피해 +10%. */
    DISCIPLINE("discipline"),
    /** 츠바이: 5칸 안의 다른 플레이어에게 저항 I. */
    GUARD("guard"),
    /** 시: 5초간 공격하지 않았다면 다음 일격 피해 2배, 흐트러짐 피해 2배. */
    FIRST_STRIKE("first_strike"),
    /** 리우: 공격 시 대상에 3초 불, 받는 화염 피해 절반. */
    BLAZE("blaze"),
    /** 세븐: 공격한 대상에게 약점 노출(받는 피해 +20%)과 발광 5초. */
    ANALYSIS("analysis"),
    /** 엄지: 리볼버 피해 +30%, 30% 확률로 탄환 미소모. */
    MARKSMAN("marksman"),
    /** 쿠로쿠모: 참격 공격 시 출혈 중첩 (최대 5). */
    BLEED("bleed"),
    /** 윤 사무소: 6칸 안에 다른 플레이어가 있으면 피해 +20%. */
    PACK("pack"),
    /** 갈고리 사무소: 체력 50% 미만 대상에게 피해 +25%. */
    HUNTER("hunter"),
    /** 가로등 사무소: 6칸 안의 다른 플레이어에게 재생 I. */
    BOND("bond"),
    /** 어금니 사무소: 3초 안에 다른 플레이어가 때린 대상에게 피해·흐트러짐 +20%. */
    COORDINATION("coordination"),
    /** 마침표 사무소: 총기 피해 +25%, 흐트러짐 피해 +50%. */
    STEADY_AIM("steady_aim"),
    /** 여명 사무소: 4초마다 체력 1 회복. */
    DAWN("dawn"),
    /** 시선 사무소: 공격한 대상에게 구속 I 2초. */
    GAZE("gaze"),
    /** 쐐기 사무소: 관통 공격이 견딤/내성을 무시한다 (최소 보통). */
    WEDGE("wedge"),
    /** 공방 소속: 해결사 무기 기술 대기시간 -20%, 해결사 무기 피해 +10%. */
    WORKSHOP("workshop"),
    /** 정 사무소: 근접 공격을 받으면 20% 확률로 피해의 60%를 되돌려준다. */
    COUNTER("counter"),
    /** W사: 때릴 때마다 충전 +1 (최대 10), 충전당 피해 +3%. 맞으면 충전 -2. */
    CHARGE("charge"),
    /** WARP: 물리 공격을 받으면 20% 확률로 공간 도약해 피한다. */
    BLINK("blink"),
    /** 웃는 얼굴들: 준 피해의 10%만큼 체력 회복. */
    DEVOUR("devour"),
    /** 검지 수행자: 40초마다 지령(참격/관통/타격 중 하나)을 받는다. 지령대로 공격하면 피해 +30%. */
    PRESCRIPT("prescript"),
    /** 필립 (불완전): 공격 시 2초 점화, 체력 50% 아래면 피해 +25%. */
    BURNING_EMOTION("burning_emotion"),
    // ---- 도시의 별 · 하나 협회 (인물별, StarPassives) ----
    DONG_HWAN("dong_hwan"),
    LOWELL("lowell"),
    CECIL("cecil"),
    MEI("mei"),
    KALO("kalo"),
    BORIS("boris"),
    KATRIEL("katriel"),
    DENIS("denis"),
    NEMO("nemo"),
    MARTINA("martina"),
    BADA("bada"),
    ESTHER("esther"),
    HUBERT("hubert"),
    GLORIA("gloria"),
    CHUN("chun"),
    XIAO("xiao"),
    MIRIS("miris"),
    RED_MIST("red_mist"),
    NIKOLAI("nikolai"),
    MYO("myo"),
    MAXIM("maxim"),
    RUDOLPH("rudolph"),
    PURPLE_TEAR("purple_tear"),
    YAN("yan"),
    ALLEN("allen"),
    IRINA("irina"),
    YAE("yae"),
    BAYARD("bayard"),
    HANA_FIXER("hana_fixer"),
    MIRINAE("mirinae"),
    HAROLD("harold"),
    OLIVIER("olivier"),
    // ---- 접대 손님 (BossPassives) ----
    AMETHYST_SHELL("amethyst_shell"),
    ARENA_ROAR("arena_roar"),
    TRACKING("tracking"),
    CORAL_ARMOR("coral_armor"),
    VIPER_GAZE("viper_gaze"),
    VOID_FIST("void_fist"),
    UNDYING("undying"),
    LAVA_HEART("lava_heart"),
    DESERT_KING("desert_king"),
    VOID_RUNE("void_rune"),
    GRUDGE("grudge"),
    ABYSSAL_HUNTER("abyssal_hunter"),
    STORM_CHAIN("storm_chain"),
    HELLFIRE("hellfire"),
    HERALD_LASER("herald_laser");

    private final String id;

    KeyPagePassive(String id) {
        this.id = id;
    }

    public String id() {
        return id;
    }

    public String nameKey() {
        return "passive.fixercity." + id;
    }

    public String descKey() {
        return "passive.fixercity." + id + ".desc";
    }
}
