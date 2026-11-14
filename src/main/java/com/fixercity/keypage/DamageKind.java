package com.fixercity.keypage;

import net.minecraft.ChatFormatting;

/** 물리 피해 유형. 원작의 참격/관통/타격. */
public enum DamageKind {
    SLASH("slash", ChatFormatting.RED),
    PIERCE("pierce", ChatFormatting.YELLOW),
    BLUNT("blunt", ChatFormatting.BLUE);

    private final String id;
    private final ChatFormatting color;

    DamageKind(String id, ChatFormatting color) {
        this.id = id;
        this.color = color;
    }

    public String id() {
        return id;
    }

    public ChatFormatting color() {
        return color;
    }

    public String translationKey() {
        return "damage_kind.fixercity." + id;
    }
}
