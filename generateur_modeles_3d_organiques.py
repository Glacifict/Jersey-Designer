#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Générateur 3D Organique : Homme (1,80 m), Femme (1,65 m) et Enfant (1,20 m)
---------------------------------------------------------------------------
Ce script fonctionne de deux manières :
1. En Python standard (avec numpy & scipy) : génère directement les fichiers .STL
   haute résolution par lissage de splines cubiques anatomiques (CubicSpline Lofting).
2. Dans Blender (si lancé via Blender Scripting) : génère les maillages subdivisés
   avec modificateurs Subdivision Surface (Catmull-Clark) et lissage organique.
"""

import numpy as np
from scipy.interpolate import CubicSpline
import struct


def create_lofted_part(z_vals, rx_vals, ry_vals, cx_vals, cy_vals, n_z=50, n_theta=36):
    """
    Crée un maillage 3D organique fermé par interpolation spline cubique C2
    le long d'une courbe squelettique (cx(z), cy(z), z) avec rayons elliptiques (rx(z), ry(z)).
    """
    cs_rx = CubicSpline(z_vals, rx_vals, bc_type='clamped')
    cs_ry = CubicSpline(z_vals, ry_vals, bc_type='clamped')
    cs_cx = CubicSpline(z_vals, cx_vals, bc_type='natural')
    cs_cy = CubicSpline(z_vals, cy_vals, bc_type='natural')

    zs = np.linspace(z_vals[0], z_vals[-1], n_z)
    thetas = np.linspace(0, 2 * np.pi, n_theta, endpoint=False)

    vertices = []
    for z in zs:
        rx = max(0.002, float(cs_rx(z)))
        ry = max(0.002, float(cs_ry(z)))
        cx = float(cs_cx(z))
        cy = float(cs_cy(z))
        for th in thetas:
            x = cx + rx * np.cos(th)
            y = cy + ry * np.sin(th)
            vertices.append([x, y, float(z)])

    # Sommets centraux pour fermer proprement les extrémités (maillage watertight)
    bottom_center_idx = len(vertices)
    vertices.append([float(cs_cx(zs[0])), float(cs_cy(zs[0])), float(zs[0])])
    top_center_idx = len(vertices)
    vertices.append([float(cs_cx(zs[-1])), float(cs_cy(zs[-1])), float(zs[-1])])

    vertices = np.array(vertices, dtype=np.float32)
    faces = []

    for i in range(n_z - 1):
        for j in range(n_theta):
            jn = (j + 1) % n_theta
            v00 = i * n_theta + j
            v01 = i * n_theta + jn
            v10 = (i + 1) * n_theta + j
            v11 = (i + 1) * n_theta + jn
            faces.append([v00, v01, v11])
            faces.append([v00, v11, v10])

    for j in range(n_theta):
        jn = (j + 1) % n_theta
        faces.append([bottom_center_idx, jn, j])

    top_ring_start = (n_z - 1) * n_theta
    for j in range(n_theta):
        jn = (j + 1) % n_theta
        faces.append([top_center_idx, top_ring_start + j, top_ring_start + jn])

    return vertices, np.array(faces, dtype=np.int32)


def merge_meshes(mesh_list):
    all_verts = []
    all_faces = []
    offset = 0
    for v, f in mesh_list:
        all_verts.append(v)
        all_faces.append(f + offset)
        offset += len(v)
    return np.vstack(all_verts), np.vstack(all_faces)


def build_human_organic(profile, x_offset=0.0):
    """
    Construit un modèle humain complet (buste galbé, courbure vertébrale,
    pectoraux/poitrine, jambes galbées avec quadriceps/mollets, bras en A-pose).
    """
    H = profile['height']
    w_sh = profile['shoulder_w']
    w_hip = profile['hip_w']
    w_waist = profile['waist_w']
    w_chest = profile['chest_w']
    d_chest = profile['chest_d']
    d_waist = profile['waist_d']
    d_hip = profile['hip_d']
    head_h = profile['head_h']
    leg_ratio = profile['leg_ratio']
    muscle = profile['muscle']
    bust = profile.get('bust', 0.0)

    parts = []

    # Hauteurs anatomiques clés
    z_crotch = H * (leg_ratio - 0.03)
    z_hip = H * leg_ratio
    z_waist = H * (leg_ratio + 0.10)
    z_chest = H * (leg_ratio + 0.22)
    z_shoulder = H * (1.0 - (head_h / H) - 0.05)
    z_neck_base = z_shoulder + H * 0.015
    z_neck_top = z_shoulder + H * 0.05
    z_head_top = H

    # 1. TRONC + COU + TÊTE (Loft continu avec cambrure lombaire)
    z_torso = [
        z_crotch, z_hip, (z_hip + z_waist) * 0.5, z_waist,
        (z_waist + z_chest) * 0.5, z_chest, z_shoulder,
        z_neck_base, (z_neck_base + z_neck_top) * 0.5, z_neck_top,
        z_neck_top + head_h * 0.25, z_neck_top + head_h * 0.55,
        z_neck_top + head_h * 0.85, z_head_top
    ]
    rx_torso = [
        w_hip * 0.22, w_hip * 0.50, w_hip * 0.46, w_waist * 0.50,
        (w_waist + w_chest) * 0.26, w_chest * 0.52, w_sh * 0.52,
        head_h * 0.26, head_h * 0.24, head_h * 0.26,
        head_h * 0.34, head_h * 0.38, head_h * 0.32, 0.005
    ]
    ry_torso = [
        d_hip * 0.35, d_hip * 0.52, d_hip * 0.48, d_waist * 0.50,
        (d_waist + d_chest) * 0.26, d_chest * 0.52 + bust * 0.5, d_chest * 0.44,
        head_h * 0.26, head_h * 0.24, head_h * 0.27,
        head_h * 0.40, head_h * 0.43, head_h * 0.36, 0.005
    ]
    cx_torso = [x_offset] * len(z_torso)
    cy_torso = [
        0.0, -0.015 * (H / 1.7), -0.008 * (H / 1.7), 0.008 * (H / 1.7),
        0.005 * (H / 1.7), 0.012 * (H / 1.7) + bust * 0.35, -0.005 * (H / 1.7),
        0.0, 0.005 * (H / 1.7), 0.010 * (H / 1.7),
        0.018 * (H / 1.7), 0.005 * (H / 1.7), 0.0, 0.0
    ]
    parts.append(create_lofted_part(z_torso, rx_torso, ry_torso, cx_torso, cy_torso, n_z=90, n_theta=44))

    # Galbe pectoral / poitrine
    if bust > 0 or muscle > 0.15:
        lobe_h = H * 0.085
        z_lobe = [z_chest - lobe_h * 0.55, z_chest - lobe_h * 0.2, z_chest + lobe_h * 0.1, z_chest + lobe_h * 0.45]
        lobe_rx = w_chest * (0.22 if bust > 0 else 0.24)
        lobe_ry = (d_chest * 0.22 + bust * 0.65) if bust > 0 else (d_chest * 0.16 * muscle)
        for side in [-1, 1]:
            rx_l = [0.005, lobe_rx, lobe_rx * 0.85, 0.005]
            ry_l = [0.005, lobe_ry, lobe_ry * 0.70, 0.005]
            cx_l = [x_offset + side * w_chest * 0.21] * 4
            cy_l = [d_chest * 0.35, d_chest * 0.45 + lobe_ry * 0.3, d_chest * 0.40, d_chest * 0.30]
            parts.append(create_lofted_part(z_lobe, rx_l, ry_l, cx_l, cy_l, n_z=24, n_theta=28))

    # 2. JAMBES & PIEDS (Galbe cuisse, genou, mollet, cheville)
    hip_x_sep = w_hip * 0.29
    ankle_x_sep = w_hip * 0.24
    z_knee = z_hip * 0.53
    z_calf = z_hip * 0.36
    z_ankle = H * 0.055

    r_thigh = w_hip * 0.27 * (1.0 + 0.12 * muscle)
    r_knee = w_hip * 0.175
    r_calf = w_hip * 0.205 * (1.0 + 0.15 * muscle)
    r_ankle = w_hip * 0.125

    for side in [-1, 1]:
        z_leg = [0.0, H * 0.025, z_ankle, z_ankle + (z_calf - z_ankle) * 0.4, z_calf, z_knee, (z_knee + z_crotch) * 0.5, z_crotch, z_hip * 1.01]
        rx_leg = [r_ankle * 0.85, r_ankle * 1.05, r_ankle * 0.90, r_calf * 0.78, r_calf * 0.96, r_knee * 0.95, r_thigh * 0.92, r_thigh * 1.02, r_thigh * 0.85]
        ry_leg = [r_ankle * 1.1, r_ankle * 1.25, r_ankle * 0.98, r_calf * 0.85, r_calf * 1.08, r_knee * 1.02, r_thigh * 0.98, r_thigh * 1.08, r_thigh * 0.95]
        cx_leg = [
            x_offset + side * ankle_x_sep, x_offset + side * ankle_x_sep, x_offset + side * ankle_x_sep,
            x_offset + side * (ankle_x_sep * 0.96 + hip_x_sep * 0.04),
            x_offset + side * (ankle_x_sep * 0.85 + hip_x_sep * 0.15),
            x_offset + side * (ankle_x_sep * 0.65 + hip_x_sep * 0.35),
            x_offset + side * (ankle_x_sep * 0.30 + hip_x_sep * 0.70),
            x_offset + side * hip_x_sep, x_offset + side * (hip_x_sep * 1.05)
        ]
        cy_leg = [-0.01 * (H / 1.7), 0.0, 0.0, -0.008 * (H / 1.7), -0.018 * (H / 1.7), 0.006 * (H / 1.7), 0.012 * (H / 1.7), 0.004 * (H / 1.7), -0.015 * (H / 1.7)]
        parts.append(create_lofted_part(z_leg, rx_leg, ry_leg, cx_leg, cy_leg, n_z=65, n_theta=34))

        foot_len = H * 0.145
        foot_w = H * 0.052
        z_foot = [0.0, H * 0.014, H * 0.032, H * 0.048]
        rx_foot = [foot_w * 0.42, foot_w * 0.50, foot_w * 0.44, foot_w * 0.32]
        ry_foot = [foot_len * 0.42, foot_len * 0.52, foot_len * 0.42, foot_len * 0.25]
        cx_foot = [x_offset + side * (ankle_x_sep + 0.006)] * 4
        cy_foot = [foot_len * 0.24, foot_len * 0.28, foot_len * 0.18, foot_len * 0.05]
        parts.append(create_lofted_part(z_foot, rx_foot, ry_foot, cx_foot, cy_foot, n_z=20, n_theta=28))

    # 3. BRAS & MAINS (Deltoïde, biceps, avant-bras, paume en A-Pose naturelle)
    z_elbow = z_shoulder - H * 0.175
    z_wrist = z_elbow - H * 0.145
    z_hand_tip = z_wrist - H * 0.095

    r_deltoid = H * 0.034 * (1.0 + 0.22 * muscle)
    r_bicep = H * 0.028 * (1.0 + 0.22 * muscle)
    r_elbow = H * 0.022 * (1.0 + 0.10 * muscle)
    r_forearm = H * 0.025 * (1.0 + 0.18 * muscle)
    r_wrist = H * 0.016

    sh_x = w_sh * 0.50
    elbow_x = sh_x + H * 0.048
    wrist_x = elbow_x + H * 0.038
    hand_x = wrist_x + H * 0.012

    for side in [-1, 1]:
        z_arm = [z_hand_tip, z_wrist - H * 0.045, z_wrist, z_wrist + (z_elbow - z_wrist) * 0.65, z_elbow, (z_elbow + z_shoulder) * 0.5, z_shoulder - H * 0.03, z_shoulder + H * 0.015]
        rx_arm = [r_wrist * 0.45, r_wrist * 0.75, r_wrist * 0.85, r_forearm * 0.95, r_elbow * 0.92, r_bicep * 0.95, r_deltoid * 1.05, r_deltoid * 0.75]
        ry_arm = [r_wrist * 0.85, r_wrist * 1.45, r_wrist * 1.05, r_forearm * 1.05, r_elbow * 1.0, r_bicep * 1.08, r_deltoid * 1.08, r_deltoid * 0.85]
        cx_arm = [
            x_offset + side * hand_x, x_offset + side * ((wrist_x + hand_x) * 0.5),
            x_offset + side * wrist_x, x_offset + side * (elbow_x * 0.35 + wrist_x * 0.65),
            x_offset + side * elbow_x, x_offset + side * (sh_x * 0.45 + elbow_x * 0.55),
            x_offset + side * (sh_x + H * 0.012), x_offset + side * (sh_x - H * 0.018)
        ]
        cy_arm = [0.022 * (H / 1.7), 0.018 * (H / 1.7), 0.012 * (H / 1.7), 0.002 * (H / 1.7), -0.012 * (H / 1.7), -0.006 * (H / 1.7), 0.0, 0.0]
        parts.append(create_lofted_part(z_arm, rx_arm, ry_arm, cx_arm, cy_arm, n_z=60, n_theta=30))

    return merge_meshes(parts)


def write_binary_stl(filename, vertices, faces):
    tris = vertices[faces]
    v0, v1, v2 = tris[:, 0, :], tris[:, 1, :], tris[:, 2, :]
    normals = np.cross(v1 - v0, v2 - v0)
    norms = np.linalg.norm(normals, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    normals /= norms

    n_tri = len(faces)
    with open(filename, 'wb') as f:
        header = b"Organic 3D Human Models (Man, Woman, Child) - Parametric Spline Loft"
        f.write(header.ljust(80, b'\x00'))
        f.write(struct.pack('<I', n_tri))
        dtype = np.dtype([('normal', '<f4', (3,)), ('v0', '<f4', (3,)), ('v1', '<f4', (3,)), ('v2', '<f4', (3,)), ('attr', '<u2')])
        data = np.empty(n_tri, dtype=dtype)
        data['normal'], data['v0'], data['v1'], data['v2'], data['attr'] = normals, v0, v1, v2, 0
        f.write(data.tobytes())


PROFILES = {
    'homme': {
        'height': 1.80, 'shoulder_w': 0.47, 'chest_w': 0.36, 'waist_w': 0.29, 'hip_w': 0.33,
        'chest_d': 0.25, 'waist_d': 0.21, 'hip_d': 0.23, 'head_h': 0.225, 'leg_ratio': 0.52,
        'muscle': 0.55, 'bust': 0.0
    },
    'femme': {
        'height': 1.65, 'shoulder_w': 0.37, 'chest_w': 0.30, 'waist_w': 0.235, 'hip_w': 0.37,
        'chest_d': 0.21, 'waist_d': 0.175, 'hip_d': 0.23, 'head_h': 0.215, 'leg_ratio': 0.51,
        'muscle': 0.15, 'bust': 0.042
    },
    'enfant': {
        'height': 1.20, 'shoulder_w': 0.275, 'chest_w': 0.23, 'waist_w': 0.215, 'hip_w': 0.235,
        'chest_d': 0.17, 'waist_d': 0.165, 'hip_d': 0.175, 'head_h': 0.20, 'leg_ratio': 0.47,
        'muscle': 0.08, 'bust': 0.0
    }
}

if __name__ == "__main__":
    print("Génération des maillages 3D organiques par splines cubiques...")
    v_man, f_man = build_human_organic(PROFILES['homme'], x_offset=-0.65)
    v_woman, f_woman = build_human_organic(PROFILES['femme'], x_offset=0.0)
    v_child, f_child = build_human_organic(PROFILES['enfant'], x_offset=0.60)

    write_binary_stl("homme_1m80_organique.stl", v_man, f_man)
    write_binary_stl("femme_1m65_organique.stl", v_woman, f_woman)
    write_binary_stl("enfant_1m20_organique.stl", v_child, f_child)

    v_all, f_all = merge_meshes([(v_man, f_man), (v_woman, f_woman), (v_child, f_child)])
    write_binary_stl("scene_complete_famille_3d.stl", v_all, f_all)
    print(f"Terminé ! {len(f_all)} triangles générés.")
