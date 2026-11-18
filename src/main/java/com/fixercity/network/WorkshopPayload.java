package com.fixercity.network;

import com.fixercity.FixerCity;
import java.util.List;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.ComponentSerialization;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

/** 서버 -> 클라이언트: 공방 화면 데이터. */
public record WorkshopPayload(Component profile, List<AugEntry> augments, RefineInfo refine, List<BindEntry> binds)
        implements CustomPacketPayload {

    public record AugEntry(String id, int level, int cost, int requiredGrade, boolean allowed) {
        public static final StreamCodec<RegistryFriendlyByteBuf, AugEntry> STREAM_CODEC = StreamCodec.composite(
                ByteBufCodecs.STRING_UTF8, AugEntry::id,
                ByteBufCodecs.VAR_INT, AugEntry::level,
                ByteBufCodecs.VAR_INT, AugEntry::cost,
                ByteBufCodecs.VAR_INT, AugEntry::requiredGrade,
                ByteBufCodecs.BOOL, AugEntry::allowed,
                AugEntry::new);
    }

    public record RefineInfo(Component itemName, int level, int cost, int chance, boolean allowed) {
        public static final StreamCodec<RegistryFriendlyByteBuf, RefineInfo> STREAM_CODEC = StreamCodec.composite(
                ComponentSerialization.STREAM_CODEC, RefineInfo::itemName,
                ByteBufCodecs.VAR_INT, RefineInfo::level,
                ByteBufCodecs.VAR_INT, RefineInfo::cost,
                ByteBufCodecs.VAR_INT, RefineInfo::chance,
                ByteBufCodecs.BOOL, RefineInfo::allowed,
                RefineInfo::new);
    }

    /** 책장 제본: 가진 손님의 책 하나당 한 줄. */
    public record BindEntry(String guest, Component page, int books, int cost, int requiredGrade, boolean allowed) {
        public static final StreamCodec<RegistryFriendlyByteBuf, BindEntry> STREAM_CODEC = StreamCodec.composite(
                ByteBufCodecs.STRING_UTF8, BindEntry::guest,
                ComponentSerialization.STREAM_CODEC, BindEntry::page,
                ByteBufCodecs.VAR_INT, BindEntry::books,
                ByteBufCodecs.VAR_INT, BindEntry::cost,
                ByteBufCodecs.VAR_INT, BindEntry::requiredGrade,
                ByteBufCodecs.BOOL, BindEntry::allowed,
                BindEntry::new);
    }

    public static final Type<WorkshopPayload> TYPE = new Type<>(FixerCity.id("workshop"));

    public static final StreamCodec<RegistryFriendlyByteBuf, WorkshopPayload> STREAM_CODEC = StreamCodec.composite(
            ComponentSerialization.STREAM_CODEC, WorkshopPayload::profile,
            AugEntry.STREAM_CODEC.apply(ByteBufCodecs.list()), WorkshopPayload::augments,
            RefineInfo.STREAM_CODEC, WorkshopPayload::refine,
            BindEntry.STREAM_CODEC.apply(ByteBufCodecs.list()), WorkshopPayload::binds,
            WorkshopPayload::new);

    @Override
    public Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
