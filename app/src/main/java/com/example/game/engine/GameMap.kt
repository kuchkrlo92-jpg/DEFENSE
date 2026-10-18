package com.example.game.engine

import com.example.game.model.Point
import com.example.game.model.TowerPlatform
import kotlin.math.sqrt

object GameMap {
    val waypoints: List<Point> = listOf(
        Point(0.10f, 0.05f), // WP 0: Portal / Spawner (Top-left)
        Point(0.88f, 0.05f), // WP 1: Across top right
        Point(0.88f, 0.22f), // WP 2: Down right
        Point(0.12f, 0.22f), // WP 3: Across to left
        Point(0.12f, 0.39f), // WP 4: Down left
        Point(0.88f, 0.39f), // WP 5: Across to right
        Point(0.88f, 0.56f), // WP 6: Down right
        Point(0.12f, 0.56f), // WP 7: Across to left
        Point(0.12f, 0.73f), // WP 8: Down left
        Point(0.88f, 0.73f), // WP 9: Across to right
        Point(0.88f, 0.88f), // WP 10: Down towards castle approach
        Point(0.50f, 0.88f)  // WP 11: Base Castle Gate
    )

    val platforms: List<TowerPlatform> = listOf(
        TowerPlatform(1, Point(0.32f, 0.135f)),
        TowerPlatform(2, Point(0.68f, 0.135f)),
        TowerPlatform(3, Point(0.32f, 0.305f)),
        TowerPlatform(4, Point(0.68f, 0.305f)),
        TowerPlatform(5, Point(0.32f, 0.475f)),
        TowerPlatform(6, Point(0.68f, 0.475f)),
        TowerPlatform(7, Point(0.32f, 0.645f)),
        TowerPlatform(8, Point(0.68f, 0.645f)),
        TowerPlatform(9, Point(0.20f, 0.81f)),
        TowerPlatform(10, Point(0.50f, 0.81f)),
        TowerPlatform(11, Point(0.78f, 0.81f)),
        TowerPlatform(12, Point(0.50f, 0.02f)),
        TowerPlatform(13, Point(0.92f, 0.475f)),
        TowerPlatform(14, Point(0.08f, 0.475f))
    )

    val segmentLengths: List<Float> by lazy {
        (0 until waypoints.size - 1).map { i ->
            waypoints[i].distanceTo(waypoints[i + 1])
        }
    }

    val totalPathLength: Float by lazy {
        segmentLengths.sum()
    }

    fun getDistanceTravelled(waypointIndex: Int, segmentProgress: Float): Float {
        var dist = 0f
        for (i in 0 until waypointIndex) {
            if (i < segmentLengths.size) {
                dist += segmentLengths[i]
            }
        }
        if (waypointIndex < segmentLengths.size) {
            dist += segmentLengths[waypointIndex] * segmentProgress.coerceIn(0f, 1f)
        }
        return dist
    }
}
