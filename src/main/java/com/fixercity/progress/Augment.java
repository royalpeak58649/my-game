package com.fixercity.progress;

/**
 * 신체 개조. 공방에서 안을 내고 몸을 고친다. 단계마다 효과가 쌓이고, 죽어도 사라지지 않는다.
 * 다음 단계에 필요한 등급: 1단계 9급, 2단계 7급, 3단계 5급, 4단계 3급, 5단계 1급.
 */
public enum Augment {
    /** 강화 근육: 공격력 +1 / 단계. */
    MUSCLE("muscle", 300),
    /** 강화 골격: 최대 체력 +2 / 단계. */
    SKELETON("skeleton", 300),
    /** 인공 신경: 이동 속도·공격 속도 +4% / 단계. */
    NEURAL("neural", 400),
    /** 피부 경화: 방어력 +1 / 단계. */
    DERMAL("dermal", 250),
    /** 흐트러짐 안정화: 흐트러짐 저항 +3 / 단계. */
    STABILIZER("stabilizer", 250);

    public static final int MAX_LEVEL = 5;
    private static final int[] REQUIRED_GRADE = {9, 7, 5, 3, 1};

    private final String id;
    private final int baseCost;

    Augment(String id, int baseCost) {
        this.id = id;
        this.baseCost = baseCost;
    }

    public String id() {
        return id;
    }

    /** current 단계에서 다음 단계로 올리는 비용. */
    public int cost(int current) {
        return baseCost * (current + 1) * (current + 1);
    }

    /** current 단계에서 다음 단계로 올리는 데 필요한 등급. */
    public static int requiredGrade(int current) {
        return REQUIRED_GRADE[Math.min(current, MAX_LEVEL - 1)];
    }

    public String nameKey() {
        return "augment.fixercity." + id;
    }

    public String descKey() {
        return "augment.fixercity." + id + ".desc";
    }

    public static Augment byId(String id) {
        for (Augment a : values()) {
            if (a.id.equals(id)) {
                return a;
            }
        }
        return null;
    }
}
