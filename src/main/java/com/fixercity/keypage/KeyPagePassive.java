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
    COUNTER("counter");

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
