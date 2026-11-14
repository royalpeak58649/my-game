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
    /** 초당 회복량 = 최대치의 10%. */
    private static final float REGEN_PER_SECOND = 0.1F;

    private float stagger = -1;
    private long lastHit = Long.MIN_VALUE / 2;
    private long lastUpdate;
    private long staggeredUntil;
    /** 마지막으로 물리 공격을 가한 시각 (시 협회 일격필살용). */
    public long lastDealt = Long.MIN_VALUE / 2;
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
        long from = Math.max(lastHit + REGEN_DELAY, lastUpdate);
        if (now > from) {
            stagger += max * REGEN_PER_SECOND * (now - from) / 20.0F;
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
}
