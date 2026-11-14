package com.fixercity.keypage;

import static com.fixercity.keypage.Resist.ENDURE;
import static com.fixercity.keypage.Resist.FATAL;
import static com.fixercity.keypage.Resist.NORMAL;
import static com.fixercity.keypage.Resist.WEAK;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 모든 책장 목록. 수치는 이 모드의 밸런스용 오리지널 값이다. */
public final class KeyPages {
    /** 책장을 끼지 않았을 때의 흐트러짐 저항. */
    public static final float BARE_STAGGER = 20.0F;

    //                     id            급  체력  흐트  속도   방어 | 체력 내성: 참 관 타 | 흐트 내성: 참 관 타 | 패시브 | 모자
    public static final KeyPage RAT = new KeyPage("rat", 9, 0, 16, 0.05F, 0,
            WEAK, WEAK, NORMAL, NORMAL, WEAK, WEAK, KeyPagePassive.SCRAMBLE, false);
    public static final KeyPage OFFICE_FIXER = new KeyPage("office_fixer", 8, 4, 22, 0.0F, 2,
            NORMAL, NORMAL, NORMAL, NORMAL, NORMAL, NORMAL, KeyPagePassive.DISCIPLINE, true);
    public static final KeyPage ZWEI = new KeyPage("zwei", 6, 10, 30, -0.05F, 6,
            ENDURE, NORMAL, ENDURE, ENDURE, NORMAL, WEAK, KeyPagePassive.GUARD, false);
    public static final KeyPage SHI = new KeyPage("shi", 6, 2, 20, 0.15F, 2,
            NORMAL, WEAK, WEAK, WEAK, NORMAL, FATAL, KeyPagePassive.FIRST_STRIKE, false);
    public static final KeyPage LIU = new KeyPage("liu", 6, 6, 26, 0.05F, 4,
            NORMAL, ENDURE, NORMAL, NORMAL, ENDURE, WEAK, KeyPagePassive.BLAZE, false);
    public static final KeyPage SEVEN = new KeyPage("seven", 6, 4, 28, 0.0F, 3,
            NORMAL, NORMAL, WEAK, ENDURE, ENDURE, NORMAL, KeyPagePassive.ANALYSIS, true);
    public static final KeyPage THUMB = new KeyPage("thumb", 5, 8, 26, 0.0F, 5,
            WEAK, ENDURE, NORMAL, NORMAL, ENDURE, NORMAL, KeyPagePassive.MARKSMAN, true);
    public static final KeyPage KUROKUMO = new KeyPage("kurokumo", 5, 6, 24, 0.10F, 3,
            ENDURE, WEAK, NORMAL, ENDURE, NORMAL, WEAK, KeyPagePassive.BLEED, false);

    public static final List<KeyPage> ALL = List.of(RAT, OFFICE_FIXER, ZWEI, SHI, LIU, SEVEN, THUMB, KUROKUMO);

    private static final Map<String, KeyPage> BY_ID = new LinkedHashMap<>();

    static {
        for (KeyPage page : ALL) {
            BY_ID.put(page.id(), page);
        }
    }

    /** id로 책장을 찾는다. 없거나 빈 문자열이면 null. */
    public static KeyPage byId(String id) {
        return id == null || id.isEmpty() ? null : BY_ID.get(id);
    }

    private KeyPages() {}
}
