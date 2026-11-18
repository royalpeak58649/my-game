package com.fixercity.reception;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

/**
 * 접대 무대: 접대실 차원에 손님마다 지어지는 원형 투기장.
 * 바닥 반지름 32칸, 높이 9칸의 벽, 그 위로 천장(높이 40)까지 보이지 않는 벽.
 * 기둥 8개가 엄폐물이 되고, 테마마다 블록과 장치(물웅덩이, 용암 창)가 다르다.
 */
public enum Stage {
    GEODE(Blocks.CALCITE, Blocks.SMOOTH_BASALT, Blocks.AMETHYST_BLOCK, Blocks.TUFF,
            Blocks.TUFF_BRICKS, Blocks.POLISHED_TUFF, Blocks.AMETHYST_BLOCK, Blocks.PEARLESCENT_FROGLIGHT,
            Blocks.LANTERN, Blocks.PURPLE_STAINED_GLASS, Feature.NONE),
    RUINS(Blocks.SANDSTONE, Blocks.CUT_SANDSTONE, Blocks.CHISELED_SANDSTONE, Blocks.SANDSTONE,
            Blocks.SMOOTH_SANDSTONE, Blocks.CUT_RED_SANDSTONE, Blocks.CHISELED_RED_SANDSTONE, Blocks.OCHRE_FROGLIGHT,
            Blocks.LANTERN, Blocks.ORANGE_STAINED_GLASS, Feature.NONE),
    REEF(Blocks.PRISMARINE_BRICKS, Blocks.PRISMARINE, Blocks.DARK_PRISMARINE, Blocks.DARK_PRISMARINE,
            Blocks.PRISMARINE_BRICKS, Blocks.DARK_PRISMARINE, Blocks.PRISMARINE, Blocks.SEA_LANTERN,
            Blocks.SEA_LANTERN, Blocks.LIGHT_BLUE_STAINED_GLASS, Feature.POOL),
    FORGE(Blocks.POLISHED_BLACKSTONE_BRICKS, Blocks.POLISHED_BASALT, Blocks.GILDED_BLACKSTONE, Blocks.BLACKSTONE,
            Blocks.NETHER_BRICKS, Blocks.RED_NETHER_BRICKS, Blocks.POLISHED_BLACKSTONE, Blocks.SHROOMLIGHT,
            Blocks.LANTERN, Blocks.IRON_BARS, Feature.LAVA_WINDOWS),
    END(Blocks.END_STONE_BRICKS, Blocks.PURPUR_BLOCK, Blocks.OBSIDIAN, Blocks.END_STONE,
            Blocks.PURPUR_BLOCK, Blocks.PURPUR_PILLAR, Blocks.OBSIDIAN, Blocks.PEARLESCENT_FROGLIGHT,
            Blocks.END_ROD, Blocks.MAGENTA_STAINED_GLASS, Feature.NONE),
    CRYPT(Blocks.DEEPSLATE_TILES, Blocks.POLISHED_DEEPSLATE, Blocks.PACKED_ICE, Blocks.COBBLED_DEEPSLATE,
            Blocks.DEEPSLATE_BRICKS, Blocks.CHISELED_DEEPSLATE, Blocks.POLISHED_DEEPSLATE, Blocks.SEA_LANTERN,
            Blocks.SOUL_LANTERN, Blocks.CYAN_STAINED_GLASS, Feature.NONE),
    FACTORY(Blocks.WAXED_CUT_COPPER, Blocks.WAXED_OXIDIZED_CUT_COPPER, Blocks.IRON_BLOCK, Blocks.WAXED_COPPER_BLOCK,
            Blocks.WAXED_WEATHERED_CUT_COPPER, Blocks.IRON_BLOCK, Blocks.WAXED_COPPER_BLOCK, Blocks.VERDANT_FROGLIGHT,
            Blocks.LANTERN, Blocks.GRAY_STAINED_GLASS, Feature.NONE);

    enum Feature { NONE, POOL, LAVA_WINDOWS }

    /** 바닥 반지름. */
    public static final int RADIUS = 32;
    /** 벽 바깥 반지름 (벽 두께 3). */
    public static final int WALL = 35;
    /** 벽 높이 (바닥 위). */
    public static final int WALL_HEIGHT = 9;
    /** 보이지 않는 천장 높이 (바닥 위). */
    public static final int CEILING = 40;
    /** 바닥 아래로 정리하는 깊이 (물웅덩이 포함). */
    public static final int DEPTH = 15;
    /** 물웅덩이 반지름과 깊이. */
    public static final int POOL_RADIUS = 12;
    public static final int POOL_DEPTH = 12;
    private static final int PILLAR_RING = 24;

    private final BlockState floorMain;
    private final BlockState floorSecond;
    private final BlockState accent;
    private final BlockState base;
    private final BlockState wall;
    private final BlockState trim;
    private final BlockState pillar;
    private final BlockState glow;
    private final BlockState pillarTop;
    private final BlockState window;
    private final Feature feature;

    Stage(Block floorMain, Block floorSecond, Block accent, Block base, Block wall, Block trim, Block pillar, Block glow,
            Block pillarTop, Block window, Feature feature) {
        this.floorMain = floorMain.defaultBlockState();
        this.floorSecond = floorSecond.defaultBlockState();
        this.accent = accent.defaultBlockState();
        this.base = base.defaultBlockState();
        this.wall = wall.defaultBlockState();
        this.trim = trim.defaultBlockState();
        this.pillar = pillar.defaultBlockState();
        this.glow = glow.defaultBlockState();
        this.pillarTop = pillarTop.defaultBlockState();
        this.window = window.defaultBlockState();
        this.feature = feature;
    }

    public boolean hasPool() {
        return feature == Feature.POOL;
    }

    /** 무대를 짓는다. 같은 자리에 있던 이전 무대는 덮어쓴다 (바뀐 블록만 놓는다). */
    public void build(ServerLevel level, BlockPos c) {
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        for (int dx = -WALL - 1; dx <= WALL + 1; dx++) {
            for (int dz = -WALL - 1; dz <= WALL + 1; dz++) {
                double d = Math.sqrt(dx * dx + dz * dz);
                for (int dy = -DEPTH; dy <= CEILING; dy++) {
                    BlockState s = stateAt(dx, dz, dy, d);
                    pos.set(c.getX() + dx, c.getY() + dy, c.getZ() + dz);
                    if (level.getBlockState(pos) != s) {
                        level.setBlock(pos, s, 2);
                    }
                }
            }
        }
    }

    private static final BlockState AIR = Blocks.AIR.defaultBlockState();
    private static final BlockState BARRIER = Blocks.BARRIER.defaultBlockState();
    private static final BlockState WATER = Blocks.WATER.defaultBlockState();
    private static final BlockState LAVA = Blocks.LAVA.defaultBlockState();
    private static final BlockState SAND = Blocks.SAND.defaultBlockState();

    private BlockState stateAt(int dx, int dz, int dy, double d) {
        if (d > WALL + 0.5) {
            return AIR;
        }
        if (d > RADIUS + 0.5) {
            return wallAt(dx, dz, dy, d);
        }
        if (dy == CEILING) {
            return BARRIER;
        }
        // 물웅덩이 (산호초 무대)
        if (feature == Feature.POOL && d <= POOL_RADIUS + 1.5 && dy < 0) {
            if (d <= POOL_RADIUS + 0.5) {
                if (dy >= -POOL_DEPTH) {
                    return WATER;
                }
                return dy == -POOL_DEPTH - 1 ? SAND : AIR;
            }
            if (dy >= -POOL_DEPTH - 1) {
                return dy == -1 ? ((dx + dz) % 4 == 0 ? glow : accent) : floorSecond;
            }
            return AIR;
        }
        if (dy == -1) {
            return floorAt(dx, dz, d);
        }
        if (dy == -2) {
            return base;
        }
        if (dy < -2) {
            return AIR;
        }
        // 기둥 8개
        int pillarHeight = 7;
        for (int k = 0; k < 8; k++) {
            double a = Math.PI / 4 * k + Math.PI / 8;
            int px = (int) Math.round(Math.cos(a) * PILLAR_RING);
            int pz = (int) Math.round(Math.sin(a) * PILLAR_RING);
            if (Math.abs(dx - px) <= 1 && Math.abs(dz - pz) <= 1) {
                if (dy < pillarHeight) {
                    return (dy == 0 || dy == pillarHeight - 1) ? trim : pillar;
                }
                if (dy == pillarHeight && dx == px && dz == pz) {
                    return pillarTop;
                }
                return AIR;
            }
        }
        return AIR;
    }

    private BlockState floorAt(int dx, int dz, double d) {
        int ring = (int) Math.round(d);
        if (ring <= 2) {
            return accent;
        }
        if (Math.floorMod(dx, 8) == 0 && Math.floorMod(dz, 8) == 0) {
            return glow;
        }
        if (ring % 7 == 0 || ring == RADIUS) {
            return accent;
        }
        if (dx == 0 || dz == 0) {
            return floorSecond;
        }
        int h = (dx * 73856093) ^ (dz * 19349663);
        return Math.floorMod(h, 5) == 0 ? floorSecond : floorMain;
    }

    private BlockState wallAt(int dx, int dz, int dy, double d) {
        boolean inner = d <= RADIUS + 1.5;
        boolean outer = d > WALL - 0.5;
        if (dy < -2) {
            return AIR;
        }
        if (dy <= -1) {
            return base;
        }
        if (dy < WALL_HEIGHT) {
            // 창: 벽 둘레를 따라 일정 간격, 높이 2~4
            double angle = Math.atan2(dz, dx);
            boolean windowColumn = Math.floorMod((int) Math.round(angle / (Math.PI * 2) * 48), 4) == 0;
            if (windowColumn && dy >= 2 && dy <= 4) {
                if (feature == Feature.LAVA_WINDOWS) {
                    return inner ? window : outer ? wall : LAVA;
                }
                return inner ? window : outer ? wall : glow;
            }
            if (dy == 0 || dy == WALL_HEIGHT - 1) {
                return trim;
            }
            return wall;
        }
        if (dy == WALL_HEIGHT) {
            if (!inner) {
                return trim;
            }
            return Math.floorMod(dx + dz, 6) == 0 ? glow : trim;
        }
        // 벽 위부터 천장까지: 바깥 테두리에 보이지 않는 벽
        if (dy <= CEILING) {
            return outer || dy == CEILING ? BARRIER : AIR;
        }
        return AIR;
    }
}
