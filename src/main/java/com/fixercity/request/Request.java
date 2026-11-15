package com.fixercity.request;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.NbtUtils;
import net.minecraft.nbt.Tag;

/** 의뢰 하나. 게시판에 걸린 상태(OPEN) -> 수락(ACTIVE) -> 목표 달성(DONE, 보고 대기). */
public class Request {
    public enum State { OPEN, ACTIVE, DONE }

    public int id;
    public RequestType type;
    public int grade;
    public State state = State.OPEN;
    /** 토벌: 엔티티 id / 납품: 아이템 id / 현상금: 조직(책장) id. */
    public String target = "";
    public int count;
    public int progress;
    /** 현상금/조사 좌표 (y는 현상범이 나타날 때 정해진다). */
    public BlockPos pos = BlockPos.ZERO;
    public String dimension = "minecraft:overworld";
    public int rewardAhn;
    public int rewardRep;
    public long deadline;
    public final List<UUID> members = new ArrayList<>();
    public boolean bountySpawned;
    public UUID bountyEntity;

    public boolean hasMember(UUID uuid) {
        return members.contains(uuid);
    }

    public CompoundTag save() {
        CompoundTag tag = new CompoundTag();
        tag.putInt("id", id);
        tag.putString("type", type.id());
        tag.putInt("grade", grade);
        tag.putString("state", state.name());
        tag.putString("target", target);
        tag.putInt("count", count);
        tag.putInt("progress", progress);
        tag.putLong("pos", pos.asLong());
        tag.putString("dim", dimension);
        tag.putInt("ahn", rewardAhn);
        tag.putInt("rep", rewardRep);
        tag.putLong("deadline", deadline);
        ListTag list = new ListTag();
        for (UUID m : members) {
            list.add(NbtUtils.createUUID(m));
        }
        tag.put("members", list);
        tag.putBoolean("spawned", bountySpawned);
        if (bountyEntity != null) {
            tag.putUUID("bounty", bountyEntity);
        }
        return tag;
    }

    public static Request load(CompoundTag tag) {
        Request r = new Request();
        r.id = tag.getInt("id");
        r.type = RequestType.byId(tag.getString("type"));
        r.grade = tag.getInt("grade");
        try {
            r.state = State.valueOf(tag.getString("state"));
        } catch (IllegalArgumentException e) {
            r.state = State.OPEN;
        }
        r.target = tag.getString("target");
        r.count = tag.getInt("count");
        r.progress = tag.getInt("progress");
        r.pos = BlockPos.of(tag.getLong("pos"));
        r.dimension = tag.getString("dim");
        r.rewardAhn = tag.getInt("ahn");
        r.rewardRep = tag.getInt("rep");
        r.deadline = tag.getLong("deadline");
        for (Tag t : tag.getList("members", Tag.TAG_INT_ARRAY)) {
            r.members.add(NbtUtils.loadUUID(t));
        }
        r.bountySpawned = tag.getBoolean("spawned");
        if (tag.hasUUID("bounty")) {
            r.bountyEntity = tag.getUUID("bounty");
        }
        return r;
    }
}
