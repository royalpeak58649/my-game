package com.fixercity.request;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.saveddata.SavedData;

/**
 * 월드에 저장되는 해결사 데이터: 플레이어별 평판/돈, 의뢰 목록.
 * 플레이어 몸이 아니라 월드에 저장되므로 죽어도, 접속하지 않아도 유지된다 (은행 잔고).
 */
public class FixerSavedData extends SavedData {
    public static final String NAME = "fixercity";
    public static final int STARTING_AHN = 500;

    public static class Profile {
        public int rep;
        public int ahn = STARTING_AHN;
        /** 첫 접속 키트를 이미 받았는지. */
        public boolean kitGiven;
        /** 우민 처치 점수 (10점마다 평판). */
        public int illagerPoints;
        /** 키트 보관함: 아직 꺼내지 않은 키트 id 목록. 월드에 저장되므로 죽어도 남는다. */
        public final List<String> storedKits = new ArrayList<>();
        /** 신체 개조 단계 (개조 id -> 1~5). 몸에 새긴 것이라 죽어도 남는다. */
        public final Map<String, Integer> augments = new HashMap<>();
    }

    /** 진행 중인 도시 이벤트 ("" = 없음)와 끝나는 시각, 다음 이벤트 시각, 이벤트 위치. */
    public String eventId = "";
    public long eventEnd;
    public long nextEventAt;
    public long eventPos;

    private final Map<UUID, Profile> profiles = new HashMap<>();
    public final List<Request> requests = new ArrayList<>();
    public final List<Office> offices = new ArrayList<>();
    public int nextId = 1;
    public long lastFill;

    public static FixerSavedData get(MinecraftServer server) {
        return server.overworld().getDataStorage().computeIfAbsent(
                new SavedData.Factory<>(FixerSavedData::new, FixerSavedData::load, null), NAME);
    }

    public Profile profile(UUID uuid) {
        return profiles.computeIfAbsent(uuid, u -> {
            setDirty();
            return new Profile();
        });
    }

    public Office officeOf(UUID uuid) {
        for (Office o : offices) {
            if (o.members.contains(uuid)) {
                return o;
            }
        }
        return null;
    }

    public Office officeNamed(String name) {
        for (Office o : offices) {
            if (o.name.equalsIgnoreCase(name)) {
                return o;
            }
        }
        return null;
    }

    public Request find(int id) {
        for (Request r : requests) {
            if (r.id == id) {
                return r;
            }
        }
        return null;
    }

    /** 이 플레이어가 참여 중인 의뢰 (ACTIVE 또는 DONE). */
    public Request activeFor(UUID uuid) {
        for (Request r : requests) {
            if (r.state != Request.State.OPEN && r.hasMember(uuid)) {
                return r;
            }
        }
        return null;
    }

    public List<Request> open() {
        List<Request> list = new ArrayList<>();
        for (Request r : requests) {
            if (r.state == Request.State.OPEN) {
                list.add(r);
            }
        }
        return list;
    }

    @Override
    public CompoundTag save(CompoundTag tag, HolderLookup.Provider registries) {
        CompoundTag p = new CompoundTag();
        profiles.forEach((uuid, profile) -> {
            CompoundTag t = new CompoundTag();
            t.putInt("rep", profile.rep);
            t.putInt("ahn", profile.ahn);
            t.putBoolean("kit", profile.kitGiven);
            t.putInt("illager", profile.illagerPoints);
            ListTag kits = new ListTag();
            profile.storedKits.forEach(k -> kits.add(net.minecraft.nbt.StringTag.valueOf(k)));
            t.put("kits", kits);
            CompoundTag aug = new CompoundTag();
            profile.augments.forEach(aug::putInt);
            t.put("augments", aug);
            p.put(uuid.toString(), t);
        });
        tag.put("profiles", p);
        ListTag list = new ListTag();
        for (Request r : requests) {
            list.add(r.save());
        }
        tag.put("requests", list);
        ListTag officeList = new ListTag();
        for (Office o : offices) {
            officeList.add(o.save());
        }
        tag.put("offices", officeList);
        tag.putInt("nextId", nextId);
        tag.putLong("lastFill", lastFill);
        tag.putString("eventId", eventId);
        tag.putLong("eventEnd", eventEnd);
        tag.putLong("nextEventAt", nextEventAt);
        tag.putLong("eventPos", eventPos);
        return tag;
    }

    public static FixerSavedData load(CompoundTag tag, HolderLookup.Provider registries) {
        FixerSavedData data = new FixerSavedData();
        CompoundTag p = tag.getCompound("profiles");
        for (String key : p.getAllKeys()) {
            try {
                Profile profile = new Profile();
                profile.rep = p.getCompound(key).getInt("rep");
                profile.ahn = p.getCompound(key).getInt("ahn");
                profile.kitGiven = p.getCompound(key).getBoolean("kit");
                profile.illagerPoints = p.getCompound(key).getInt("illager");
                for (Tag k : p.getCompound(key).getList("kits", Tag.TAG_STRING)) {
                    profile.storedKits.add(k.getAsString());
                }
                CompoundTag aug = p.getCompound(key).getCompound("augments");
                for (String a : aug.getAllKeys()) {
                    profile.augments.put(a, aug.getInt(a));
                }
                data.profiles.put(UUID.fromString(key), profile);
            } catch (IllegalArgumentException ignored) {
                // 잘못된 UUID는 무시
            }
        }
        for (Tag t : tag.getList("requests", Tag.TAG_COMPOUND)) {
            data.requests.add(Request.load((CompoundTag) t));
        }
        for (Tag t : tag.getList("offices", Tag.TAG_COMPOUND)) {
            data.offices.add(Office.load((CompoundTag) t));
        }
        data.nextId = Math.max(1, tag.getInt("nextId"));
        data.lastFill = tag.getLong("lastFill");
        data.eventId = tag.getString("eventId");
        data.eventEnd = tag.getLong("eventEnd");
        data.nextEventAt = tag.getLong("nextEventAt");
        data.eventPos = tag.getLong("eventPos");
        return data;
    }
}
