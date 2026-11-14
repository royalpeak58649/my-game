package com.fixercity.item;

/** 해결사 리볼버: 6연발, 9 피해, 사거리 40, 관통 없음. 공명 없음 (범용 총기). */
public class RevolverItem extends GunItem {
    public RevolverItem(Properties properties) {
        super(properties, 6, 9.0F, 40.0, 10, 40, 1, 0.6F, null);
    }
}
