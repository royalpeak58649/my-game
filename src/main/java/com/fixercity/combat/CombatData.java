package com.fixercity.combat;

/**
 * 생물 하나의 흐트러짐 게이지와 전투 타이머. 저장하지 않는 임시 데이터.
 * 회복은 매 틱 돌리지 않고, 읽을 때 지난 시간만큼 한꺼번에 계산한다.
 */
public class CombatData {
    /** 마지막 피격 후 이 틱 수가 지나면 회복 시작 (5초). */
    public static final int REGEN_DELAY = 100;
    /** 흐트러진 상태 지속 시간 (3초). */
    public static final int STAGGER_DURATION = 60;
    /** 이 개체의 회복 지연(틱)과 초당 회복 비율. 장신구로 바뀐다. */
    public int regenDelay = REGEN_DELAY;
    public float regenRate = 0.1F;

    private float stagger = -1;
    private long lastHit = Long.MIN_VALUE / 2;
    private long lastUpdate;
    private long staggeredUntil;
    /** 마지막으로 물리 공격을 가한 시각 (시 협회 일격필살용). */
    public long lastDealt = Long.MIN_VALUE / 2;
    /** HUD 동기화: 마지막으로 보낸 값. */
    public float lastSentStagger = -1;
    public float lastSentMax = -1;
    public boolean lastSentStaggered;
    /** W사 충전 스택 (0~10). */
    public int charge;
    /** 검지 수행자 지령: DamageKind ordinal (-1 = 없음). */
    public int prescript = -1;
    /** 정 사무소 받아치기 자세가 끝나는 시각과 반격 배율. */
    public long counterUntil;
    public float counterPower;
    /** 어금니 사무소 연계: 마지막으로 이 대상을 때린 플레이어와 시각. */
    public java.util.UUID lastHitBy;
    public long lastHitByTime = Long.MIN_VALUE / 2;
    /** 쿠로쿠모 매듭 흡혈 마지막 시각. */
    public long lastLifesteal = Long.MIN_VALUE / 2;
    /** 츠바이 수호 태세가 끝나는 시각. */
    public long guardUntil;
    /** 수호 태세가 공명 상태인지. */
    public boolean guardEmpowered;

    public boolean isGuarding(long now) {
        return now < guardUntil;
    }

    private void update(long now, float max) {
        if (stagger < 0) {
            stagger = max;
            lastUpdate = now;
        }
        if (staggeredUntil != 0) {
            if (now >= staggeredUntil) {
                staggeredUntil = 0;
                stagger = max;
            }
            lastUpdate = now;
            return;
        }
        long from = Math.max(lastHit + regenDelay, lastUpdate);
        if (now > from) {
            stagger += max * regenRate * (now - from) / 20.0F;
        }
        stagger = Math.min(stagger, max);
        lastUpdate = now;
    }

    public float current(long now, float max) {
        update(now, max);
        return stagger;
    }

    public boolean isStaggered(long now) {
        return staggeredUntil != 0 && now < staggeredUntil;
    }

    /** 게이지를 최대치의 fraction만큼 채운다 (응급 키트 등). */
    public void restore(long now, float max, float fraction) {
        update(now, max);
        stagger = Math.min(max, stagger + max * fraction);
    }

    /** 흐트러짐 피해를 준다. 이번 공격으로 흐트러졌으면 true. */
    public boolean damage(long now, float max, float amount) {
        update(now, max);
        lastHit = now;
        if (isStaggered(now)) {
            return false;
        }
        stagger -= amount;
        if (stagger <= 0) {
            stagger = 0;
            staggeredUntil = now + STAGGER_DURATION;
            return true;
        }
        return false;
    }

    /** 흐트러짐을 즉시 풀고 게이지를 가득 채운다 (야에: 즉시 수리). */
    public void clearStagger(long now, float max) {
        staggeredUntil = 0;
        stagger = max;
        lastUpdate = now;
    }

    // ---- 도시의 별 · 하나 협회 책장 (StarPassives) ----
    public int emotion;
    public int emotionPoints;
    public long lastCombat = Long.MIN_VALUE / 2;
    public long combatStart;
    public int combatHits;
    public int lowellStacks;
    public int smoke;
    public long chargeGainedAt = Long.MIN_VALUE / 2;
    public long chargeSpentAt = Long.MIN_VALUE / 2;
    public boolean egoUsed;
    public long egoUntil;
    public long insuranceReadyAt;
    public long fragileUntil;
    public long boundAt;
    public long trigramNextAt;
    public int trigramUsed;
    public int ammoCounter;
    public long scarAt = Long.MIN_VALUE / 2;
    public java.util.UUID markedTarget;
    public long markedUntil;
    public long markedFrom;
    /** 보라색 눈물 자세: 0 참격, 1 관통, 2 타격, 3 수비. */
    public int stance;
    public int hitStreak;
    public final float[] recentDamage = new float[3];
    public long recentDamageAt = Long.MIN_VALUE / 2;
    public long resuscitateReadyAt;
    public boolean repairUsed;

    // ---- 접대 손님 책장 (BossPassives) ----
    public int guestCounter;
    public java.util.UUID guestTarget;
    public long guestReadyAt;
}
