package com.fixercity.world;

import com.fixercity.FixerCity;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.level.Level;

/** 도시 차원. data/fixercity/dimension/the_city.json 으로 정의된다. */
public final class CityDimension {
    public static final ResourceKey<Level> THE_CITY = ResourceKey.create(Registries.DIMENSION, FixerCity.id("the_city"));
    /** 평탄 지형 맨 윗블록 높이 (지면 = 이 위). */
    public static final int GROUND = 62;

    private CityDimension() {}
}
