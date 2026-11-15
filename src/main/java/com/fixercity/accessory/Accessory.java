package com.fixercity.accessory;

/**
 * 장신구 정의. 몸에 하나만 착용 (책장과 같은 방식, 죽으면 잃는다).
 * 맞는 책장을 끼고 있으면 공명: 효과 강화.
 */
public enum Accessory {
    /** 행운의 동전: 물리 피해 회피 10% (공명 18%). */
    LUCKY_COIN("lucky_coin", "rat"),
    /** 사무소 배지: 흐트러짐 회복이 3초 뒤 시작 (공명 2초, 회복 속도 1.5배). */
    OFFICE_BADGE("office_badge", "office_fixer"),
    /** 츠바이 완장: 흐트러짐 저항 +4, 넉백 저항 30% (공명 +8, 50%). */
    ZWEI_ARMBAND("zwei_armband", "zwei"),
    /** 시 협회 칼끈: 흐트러진 대상에게 주는 피해 +30% (공명 +50%). */
    SHI_TASSEL("shi_tassel", "shi"),
    /** 리우 화염 부적: 받는 화염 피해 절반, 불타는 대상에게 피해 +15% (공명: 화염 면역, +25%). */
    LIU_TALISMAN("liu_talisman", "liu"),
    /** 세븐 단안경: 실명/어둠 면역, 약점 노출된 대상에게 피해 +10% (공명 +20%). */
    SEVEN_MONOCLE("seven_monocle", "seven"),
    /** 엄지 탄띠: 재장전 시간 40% 감소, 탄 절약 +15% (공명 60% 감소, +25%). */
    THUMB_BANDOLIER("thumb_bandolier", "thumb"),
    /** 쿠로쿠모 붉은 매듭: 출혈 중인 대상을 때리면 체력 1 회복, 초당 1회 (공명 2). */
    KUROKUMO_KNOT("kurokumo_knot", "kurokumo");

    private final String id;
    private final String resonancePage;

    Accessory(String id, String resonancePage) {
        this.id = id;
        this.resonancePage = resonancePage;
    }

    public String id() {
        return id;
    }

    public String resonancePage() {
        return resonancePage;
    }

    public static Accessory byId(String id) {
        for (Accessory a : values()) {
            if (a.id.equals(id)) {
                return a;
            }
        }
        return null;
    }
}
