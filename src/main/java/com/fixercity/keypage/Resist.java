package com.fixercity.keypage;

import net.minecraft.ChatFormatting;

/** 내성 등급: 받는 피해(또는 흐트러짐 피해)에 곱해지는 배율. */
public enum Resist {
    FATAL("fatal", 2.0F, ChatFormatting.DARK_RED),
    WEAK("weak", 1.5F, ChatFormatting.RED),
    NORMAL("normal", 1.0F, ChatFormatting.WHITE),
    ENDURE("endure", 0.5F, ChatFormatting.AQUA),
    INEFFECTIVE("ineffective", 0.25F, ChatFormatting.DARK_AQUA);

    private final String id;
    private final float multiplier;
    private final ChatFormatting color;

    Resist(String id, float multiplier, ChatFormatting color) {
        this.id = id;
        this.multiplier = multiplier;
        this.color = color;
    }

    public float multiplier() {
        return multiplier;
    }

    public ChatFormatting color() {
        return color;
    }

    public String translationKey() {
        return "resist.fixercity." + id;
    }
}
