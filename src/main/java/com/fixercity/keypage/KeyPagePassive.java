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
    BLEED("bleed");

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
