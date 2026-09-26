import math
from pathlib import Path

import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix

OUT = Path("models/royal-phoenix-v1.glb")
OUT.parent.mkdir(parents=True, exist_ok=True)
scene = trimesh.Scene()

COLORS = {
    "obsidian": [18, 7, 10, 255],
    "charcoal": [35, 16, 21, 255],
    "burgundy": [79, 7, 24, 255],
    "crimson": [162, 13, 43, 255],
    "scarlet": [210, 43, 53, 255],
    "gold": [216, 177, 92, 255],
    "ember": [255, 99, 56, 255],
    "eye": [255, 196, 92, 255],
}


def material(color, metallic=0.4, roughness=0.42, name=None, emissive=None):
    result = trimesh.visual.material.PBRMaterial(
        name=name,
        baseColorFactor=np.array(COLORS[color]) / 255.0,
        metallicFactor=metallic,
        roughnessFactor=roughness,
    )
    if emissive:
        result.emissiveFactor = np.array(COLORS[emissive][:3]) / 255.0
    return result


MATERIALS = {
    "body": material("burgundy", 0.52, 0.32, "BurgundyFeather"),
    "crimson": material("crimson", 0.44, 0.30, "CrimsonFeather"),
    "scarlet": material("scarlet", 0.40, 0.28, "ScarletEdge"),
    "gold": material("gold", 0.82, 0.20, "AntiqueGold"),
    "dark": material("obsidian", 0.55, 0.38, "Obsidian"),
    "charcoal": material("charcoal", 0.48, 0.42, "Charcoal"),
    "ember": material("ember", 0.20, 0.25, "Ember"),
    "eye": material("eye", 0.10, 0.18, "EyeGlow", emissive="ember"),
}


def add(mesh, name, mat):
    mesh = mesh.copy()
    mesh.visual = trimesh.visual.TextureVisuals(material=mat)
    scene.add_geometry(mesh, geom_name=name, node_name=name)
    return mesh


def align_z_to_vector(vector):
    vector = np.array(vector, dtype=float)
    vector /= np.linalg.norm(vector)
    z_axis = np.array([0.0, 0.0, 1.0])
    axis = np.cross(z_axis, vector)
    dot = np.clip(np.dot(z_axis, vector), -1.0, 1.0)
    if np.linalg.norm(axis) < 1e-8:
        return np.eye(4) if dot > 0 else rotation_matrix(math.pi, [1, 0, 0])
    axis /= np.linalg.norm(axis)
    return rotation_matrix(math.acos(dot), axis)


def ellipsoid(name, center, radii, mat, subdivisions=3):
    mesh = trimesh.creation.icosphere(subdivisions=subdivisions, radius=1.0)
    mesh.apply_scale(radii)
    mesh.apply_translation(center)
    return add(mesh, name, mat)


def cylinder_between(name, a, b, radius, mat, sections=16):
    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    vector = b - a
    mesh = trimesh.creation.cylinder(
        radius=radius, height=np.linalg.norm(vector), sections=sections
    )
    mesh.apply_transform(align_z_to_vector(vector))
    mesh.apply_translation((a + b) / 2)
    return add(mesh, name, mat)


def cone_between(name, a, b, radius, mat, sections=12):
    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    vector = b - a
    mesh = trimesh.creation.cone(
        radius=radius, height=np.linalg.norm(vector), sections=sections
    )
    mesh.apply_transform(align_z_to_vector(vector))
    mesh.apply_translation((a + b) / 2)
    return add(mesh, name, mat)


def feather(name, root, tip, width, thickness, mat, curl=0.0):
    root = np.array(root, dtype=float)
    tip = np.array(tip, dtype=float)
    direction = tip - root
    length = np.linalg.norm(direction)

    vertices = np.array(
        [
            [-width * 0.50, 0, 0],
            [width * 0.50, 0, 0],
            [-width * 0.38, thickness * 0.45, length * 0.30],
            [width * 0.38, thickness * 0.45, length * 0.30],
            [-width * 0.24, -thickness * 0.35, length * 0.72],
            [width * 0.24, -thickness * 0.35, length * 0.72],
            [0, curl, length],
        ],
        dtype=float,
    )
    faces = np.array(
        [
            [0, 1, 2],
            [1, 3, 2],
            [2, 3, 4],
            [3, 5, 4],
            [4, 5, 6],
            [1, 0, 3],
            [0, 2, 3],
            [3, 2, 5],
            [2, 4, 5],
        ]
    )
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    mesh.apply_transform(align_z_to_vector(direction))
    mesh.apply_translation(root)
    return add(mesh, name, mat)


# Core silhouette.
ellipsoid("Body", [0, -0.05, 0], [0.95, 1.48, 0.72], MATERIALS["body"], 4)
ellipsoid("Chest", [0, 0.45, 0.24], [0.70, 1.02, 0.56], MATERIALS["crimson"], 3)
ellipsoid("UpperChest", [0, 0.98, 0.18], [0.58, 0.72, 0.46], MATERIALS["scarlet"], 3)
ellipsoid("Head", [0, 2.0, 0.04], [0.48, 0.43, 0.42], MATERIALS["crimson"], 3)
cylinder_between("Neck", [-0.02, 0.95, 0.02], [-0.04, 1.72, 0.04], 0.34, MATERIALS["body"], 18)
cone_between("Beak", [0, 1.96, 0.34], [0, 1.94, 0.92], 0.20, MATERIALS["gold"], 8)

for side in (-1, 1):
    ellipsoid(
        f"Eye_{side}",
        [side * 0.22, 2.09, 0.37],
        [0.065, 0.065, 0.05],
        MATERIALS["eye"],
        2,
    )

# Crown-like crest.
for index in range(7):
    lane = index - 3
    feather(
        f"Crest_{index}",
        [lane * 0.055, 2.28, -0.06],
        [lane * 0.22, 3.30 - abs(lane) * 0.10, -0.32],
        0.12 + 0.03 * (3 - abs(lane)),
        0.06,
        MATERIALS["gold"] if index % 2 == 0 else MATERIALS["scarlet"],
        curl=0.04,
    )

# Crimson rose language at the shoulders.
for side in (-1, 1):
    center = np.array([side * 0.92, 1.04, 0.18])
    for index in range(11):
        angle = index / 11 * math.tau
        tip = center + np.array(
            [math.cos(angle) * 0.46, math.sin(angle) * 0.46, 0.08 * math.sin(angle * 2)]
        )
        feather(
            f"Rose_{side}_{index}",
            center,
            tip,
            0.22,
            0.09,
            MATERIALS["crimson"],
            curl=0.015,
        )

# Five layered wing families.
for side in (-1, 1):
    wing_root = np.array([side * 0.72, 0.86, 0.0])
    feather_index = 0
    for layer in range(5):
        count = 12 + layer
        for index in range(count):
            t = index / (count - 1)
            reach = 2.3 + 3.4 * t + layer * 0.28
            tip = np.array(
                [
                    side * (0.30 + reach),
                    1.40 + layer * 0.28 - 2.0 * (t**1.28) + 0.18 * math.sin(t * math.pi),
                    0.15 * math.sin(index * 0.65 + layer) + 0.10 * layer,
                ]
            )
            root = wing_root + np.array(
                [
                    side * (0.08 * layer + 0.035 * index),
                    0.06 * layer - 0.035 * index,
                    0.025 * (index - count / 2),
                ]
            )
            width = 0.46 + 0.16 * (1 - t) + 0.035 * layer
            wing_material = [
                MATERIALS["dark"],
                MATERIALS["body"],
                MATERIALS["crimson"],
                MATERIALS["scarlet"],
                MATERIALS["gold"],
            ][layer]
            if (index + layer) % 8 == 0:
                wing_material = MATERIALS["gold"]
            feather(
                f"Wing_{side}_{feather_index}",
                root,
                tip,
                width,
                0.11,
                wing_material,
                curl=0.10 * math.sin(t * math.pi),
            )
            feather_index += 1

# V-shaped layered breast plumage.
for row in range(6):
    count = 5 + row
    y = 1.15 - row * 0.30
    for index in range(count):
        side = (index - (count - 1) / 2) / max(1, (count - 1) / 2)
        root = [side * 0.35, y, 0.50]
        tip = [side * (0.55 + 0.10 * row), y - 0.48 - 0.06 * row, 0.62 - 0.06 * abs(side)]
        chest_material = (
            MATERIALS["gold"]
            if (row == 0 and abs(side) < 0.3) or ((index + row) % 7 == 0)
            else (MATERIALS["scarlet"] if row < 3 else MATERIALS["body"])
        )
        feather(
            f"ChestFeather_{row}_{index}",
            root,
            tip,
            0.18 + 0.025 * row,
            0.07,
            chest_material,
            curl=0.03,
        )

# Long multi-segment tail feathers.
for index in range(13):
    lane = index - 6
    side = lane / 6
    points = [
        np.array([side * 0.28, -1.15, -0.03 * abs(side)]),
        np.array([side * 0.72, -2.15, 0.18 * math.sin(index)]),
        np.array([side * 1.30 + math.sin(index * 1.3) * 0.24, -3.42, 0.30 * math.cos(index * 0.7)]),
        np.array([side * 1.95 + math.cos(index) * 0.48, -5.05 - abs(side) * 0.55, 0.34 * math.sin(index * 1.1)]),
    ]
    tail_material = (
        MATERIALS["gold"]
        if index % 4 == 0
        else (MATERIALS["dark"] if index % 3 == 0 else MATERIALS["crimson"])
    )
    for segment in range(3):
        feather(
            f"Tail_{index}_{segment}",
            points[segment],
            points[segment + 1],
            0.26 - 0.04 * segment,
            0.10,
            tail_material,
            curl=0.10 * (segment + 1),
        )
    if index % 3 == 1:
        ellipsoid(
            f"TailGem_{index}",
            points[-1],
            [0.12, 0.20, 0.08],
            MATERIALS["ember"],
            2,
        )

# Gold legs and talons.
for side in (-1, 1):
    cylinder_between(
        f"Leg_{side}",
        [side * 0.34, -1.25, 0.06],
        [side * 0.34, -1.92, 0.05],
        0.09,
        MATERIALS["gold"],
        10,
    )
    for toe in (-1, 0, 1):
        cone_between(
            f"Talon_{side}_{toe}",
            [side * 0.34, -1.92, 0.08],
            [side * 0.34 + toe * 0.18, -2.08, 0.48 + abs(toe) * 0.08],
            0.055,
            MATERIALS["gold"],
            7,
        )

ellipsoid("CrownGem", [0, 0.42, 0.70], [0.12, 0.16, 0.07], MATERIALS["gold"], 2)

# Merge by material so the browser renders a small number of draw calls.
optimized = trimesh.Scene()
groups = {}
for mesh in scene.geometry.values():
    material_name = getattr(getattr(mesh.visual, "material", None), "name", None) or "Material"
    groups.setdefault(material_name, []).append(mesh)

for material_name, meshes in groups.items():
    merged = trimesh.util.concatenate(meshes)
    merged.visual = trimesh.visual.TextureVisuals(material=meshes[0].visual.material)
    optimized.add_geometry(merged, geom_name=material_name, node_name=material_name)

payload = optimized.export(file_type="glb")
OUT.write_bytes(payload)

loaded = trimesh.load(OUT, force="scene")
bounds = loaded.bounds
assert len(payload) > 100_000
assert 4 <= len(loaded.geometry) <= 10
assert bounds[0][0] < -6 and bounds[1][0] > 6
assert bounds[0][1] < -5 and bounds[1][1] > 3

print(
    f"generated {OUT}: {len(payload)} bytes, "
    f"{len(loaded.geometry)} merged geometries, bounds={bounds.tolist()}"
)
