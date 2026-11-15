package com.fixercity.request;

public enum RequestType {
    /** 토벌: 특정 몹 N마리 처치. */
    EXTERMINATION("extermination", 1.0F, 48000),
    /** 현상금: 먼 곳에 나타나는 현상범 처치. 조직 장비를 떨어뜨릴 수 있다. */
    BOUNTY("bounty", 1.5F, 72000),
    /** 납품 (더 이상 새로 나오지 않음. 예전 저장 데이터 호환용). */
    DELIVERY("delivery", 0.8F, 72000),
    /** 현장 조사: 지정 좌표에 가 본다. */
    INVESTIGATION("investigation", 0.6F, 48000),
    /** 호위: 의뢰인을 목적지까지 데려간다. 의뢰인이 죽으면 실패. */
    ESCORT("escort", 1.3F, 48000),
    /** 방어: 지점에 가면 습격이 3차례 몰려온다. 모두 막아낸다. */
    DEFENSE("defense", 1.4F, 48000),
    /** 회수: 경비가 지키는 의뢰품(서류 가방)을 찾아 게시판에 가져온다. */
    RETRIEVAL("retrieval", 1.2F, 72000),
    /** 순찰: 지점 3곳을 순서대로 돈다. */
    PATROL("patrol", 0.8F, 48000),
    /** 소탕: 뒷골목 조직의 아지트에 가서 조직원을 전부 처치한다. */
    RAID("raid", 1.2F, 48000),
    /** 운송: 받은 서류 가방을 목적지까지 나른다. 도중에 매복이 있다. */
    TRANSPORT("transport", 1.1F, 48000);

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
