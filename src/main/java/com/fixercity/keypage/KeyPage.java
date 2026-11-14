package com.fixercity.keypage;

/**
 * 책장 하나의 정의.
 *
 * @param id       내부 이름 (아이템 이름 = "key_page_" + id)
 * @param grade    해결사 등급 기준 (9 = 9급 ... 1 = 1급)
 * @param health   최대 체력 보너스 (하트 반 칸 = 1)
 * @param stagger  흐트러짐 저항 최대치
 * @param speed    이동 속도 배율 보너스 (0.1 = +10%)
 * @param armor    방어력 보너스
 * @param hat      옷 모델에 모자를 그릴지
 */
public record KeyPage(
        String id, int grade, float health, float stagger, float speed, float armor,
        Resist slash, Resist pierce, Resist blunt,
        Resist staggerSlash, Resist staggerPierce, Resist staggerBlunt,
        KeyPagePassive passive, boolean hat) {

    public Resist hpResist(DamageKind kind) {
        return switch (kind) {
            case SLASH -> slash;
            case PIERCE -> pierce;
            case BLUNT -> blunt;
        };
    }

    public Resist staggerResist(DamageKind kind) {
        return switch (kind) {
            case SLASH -> staggerSlash;
            case PIERCE -> staggerPierce;
            case BLUNT -> staggerBlunt;
        };
    }

    public String translationKey() {
        return "key_page.fixercity." + id;
    }
}
