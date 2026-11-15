package com.fixercity.request;

public enum RequestType {
    /** 토벌: 특정 몹 N마리 처치. */
    EXTERMINATION("extermination", 1.0F, 48000),
    /** 현상금: 먼 곳에 나타나는 현상범 처치. 조직 장비를 떨어뜨릴 수 있다. */
    BOUNTY("bounty", 1.5F, 72000),
    /** 납품: 아이템 N개를 게시판에 가져온다. */
    DELIVERY("delivery", 0.8F, 72000),
    /** 현장 조사: 지정 좌표에 가 본다. */
    INVESTIGATION("investigation", 0.6F, 48000);

    private final String id;
    private final float rewardMultiplier;
    private final int duration;

    RequestType(String id, float rewardMultiplier, int duration) {
        this.id = id;
        this.rewardMultiplier = rewardMultiplier;
        this.duration = duration;
    }

    public String id() {
        return id;
    }

    public float rewardMultiplier() {
        return rewardMultiplier;
    }

    /** 제한 시간 (틱). 24000 = 마인크래프트 하루. */
    public int duration() {
        return duration;
    }

    public static RequestType byId(String id) {
        for (RequestType t : values()) {
            if (t.id.equals(id)) {
                return t;
            }
        }
        return EXTERMINATION;
    }
}
