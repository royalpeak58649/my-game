package com.fixercity.request;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.NbtUtils;
import net.minecraft.nbt.Tag;

/** 사무소: 플레이어들이 만드는 고정 팀. 의뢰를 수락하면 접속 중인 사무소원 전원이 함께 참여한다. */
public class Office {
    public String name;
    public UUID leader;
    public final List<UUID> members = new ArrayList<>();

    public CompoundTag save() {
        CompoundTag tag = new CompoundTag();
        tag.putString("name", name);
        tag.putUUID("leader", leader);
        ListTag list = new ListTag();
        members.forEach(m -> list.add(NbtUtils.createUUID(m)));
        tag.put("members", list);
        return tag;
    }

    public static Office load(CompoundTag tag) {
        Office o = new Office();
        o.name = tag.getString("name");
        o.leader = tag.getUUID("leader");
        for (Tag t : tag.getList("members", Tag.TAG_INT_ARRAY)) {
            o.members.add(NbtUtils.loadUUID(t));
        }
        return o;
    }
}
