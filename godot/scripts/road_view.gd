extends Control

var runtime_state: Dictionary = {}


func set_runtime_state(state: Dictionary) -> void:
	runtime_state = state
	queue_redraw()


func _draw() -> void:
	var size := get_size()
	draw_rect(Rect2(Vector2.ZERO, size), Color.from_string("#07111d", Color.BLACK), true)
	if runtime_state.is_empty():
		return

	var stage: Dictionary = runtime_state.get("stage", {})
	var next_stage: Dictionary = runtime_state.get("next_stage", stage)
	var transition := float(runtime_state.get("transition", 0.0))
	var palette := _mix_palette(stage.get("palette", {}), next_stage.get("palette", {}), transition)
	var horizon_lift := float(stage.get("horizonLift", 0.02))
	var horizon_y := size.y * (0.34 + horizon_lift)
	var distance := float(runtime_state.get("distance", 0.0))
	var lateral := float(runtime_state.get("lateral", 0.0))
	var road_curve := float(runtime_state.get("road_curve", 0.0))

	_draw_sky(palette, horizon_y, size)
	_draw_backdrop(stage, palette, horizon_y, size, distance)
	_draw_road(palette, horizon_y, size, lateral, road_curve)
	_draw_player(size, lateral)


func _draw_sky(palette: Dictionary, horizon_y: float, size: Vector2) -> void:
	var top_color := _html_color(palette.get("skyTop", "#10234b"))
	var mid_color := _html_color(palette.get("skyMid", "#7e4f7f"))
	var bottom_color := _html_color(palette.get("skyBottom", "#f1ba82"))
	for step in range(18):
		var t := float(step) / 17.0
		var blend := top_color.lerp(mid_color, min(t * 2.0, 1.0)).lerp(bottom_color, max((t - 0.45) * 1.8, 0.0))
		var y := t * (horizon_y + size.y * 0.1)
		draw_rect(Rect2(0.0, y, size.x, size.y / 18.0 + 2.0), blend, true)
	var sun_color := _html_color(palette.get("sun", "#ffd66b"))
	draw_circle(Vector2(size.x * 0.72, horizon_y * 0.5), size.y * 0.06, sun_color)


func _draw_backdrop(stage: Dictionary, palette: Dictionary, horizon_y: float, size: Vector2, distance: float) -> void:
	var far_color := _html_color(palette.get("farSilhouette", "#445b84"))
	var near_color := _html_color(palette.get("nearSilhouette", "#10192a"))
	var skyline_strength := float(stage.get("skyline", 0.2))
	var far_points := PackedVector2Array()
	far_points.push_back(Vector2(0.0, horizon_y))
	for index in range(9):
		var x := (size.x / 8.0) * index
		var wave := sin(index * 0.9 + distance * 0.00018) * 24.0 + cos(index * 1.1 + distance * 0.00012) * 18.0
		far_points.push_back(Vector2(x, horizon_y - 36.0 - wave - skyline_strength * 24.0))
	far_points.push_back(Vector2(size.x, size.y))
	far_points.push_back(Vector2.ZERO + Vector2(0.0, size.y))
	draw_colored_polygon(far_points, far_color)

	var skyline_color := _html_color(palette.get("cityLight", "#9de5ff"))
	for index in range(10 + int(skyline_strength * 8.0)):
		var width := 28.0 + float(index % 4) * 14.0
		var height := 46.0 + float(index % 5) * 20.0 + skyline_strength * 80.0
		var x := (float(index) / 12.0) * size.x
		draw_rect(Rect2(x, horizon_y + 16.0 - height, width, height), near_color, true)
		if skyline_strength > 0.35:
			draw_rect(Rect2(x + 6.0, horizon_y + 24.0 - height, 4.0, 6.0), skyline_color, true)
			draw_rect(Rect2(x + width - 10.0, horizon_y + 40.0 - height, 3.0, 5.0), skyline_color, true)


func _draw_road(palette: Dictionary, horizon_y: float, size: Vector2, lateral: float, road_curve: float) -> void:
	var slices := 28
	for slice in range(slices, 0, -1):
		var near_depth := float(slice) / float(slices)
		var far_depth := float(slice - 1) / float(slices)
		var near := _road_geometry(near_depth, road_curve, lateral, horizon_y, size)
		var far := _road_geometry(far_depth, road_curve, lateral, horizon_y, size)
		var road_color := _html_color(palette.get("road", "#46515d"))
		var shoulder_color := _html_color(palette.get("shoulder", "#8e8570"))
		var curb_color := _html_color(palette.get(slice % 2 == 0 ? "curbA" : "curbB", "#ffffff"))
		_draw_quad(
			Vector2(far["center"] - far["road_half"] - 100.0 * far_depth, far["y"]),
			Vector2(far["center"] - far["road_half"], far["y"]),
			Vector2(near["center"] - near["road_half"], near["y"]),
			Vector2(near["center"] - near["road_half"] - 160.0 * near_depth, near["y"]),
			shoulder_color
		)
		_draw_quad(
			Vector2(far["center"] + far["road_half"], far["y"]),
			Vector2(far["center"] + far["road_half"] + 100.0 * far_depth, far["y"]),
			Vector2(near["center"] + near["road_half"] + 160.0 * near_depth, near["y"]),
			Vector2(near["center"] + near["road_half"], near["y"]),
			shoulder_color
		)
		_draw_quad(
			Vector2(far["center"] - far["road_half"], far["y"]),
			Vector2(far["center"] + far["road_half"], far["y"]),
			Vector2(near["center"] + near["road_half"], near["y"]),
			Vector2(near["center"] - near["road_half"], near["y"]),
			road_color
		)
		_draw_quad(
			Vector2(far["center"] - far["road_half"] - 12.0, far["y"]),
			Vector2(far["center"] - far["road_half"], far["y"]),
			Vector2(near["center"] - near["road_half"], near["y"]),
			Vector2(near["center"] - near["road_half"] - 14.0, near["y"]),
			curb_color
		)
		_draw_quad(
			Vector2(far["center"] + far["road_half"], far["y"]),
			Vector2(far["center"] + far["road_half"] + 12.0, far["y"]),
			Vector2(near["center"] + near["road_half"] + 14.0, near["y"]),
			Vector2(near["center"] + near["road_half"], near["y"]),
			curb_color
		)


func _draw_player(size: Vector2, lateral: float) -> void:
	var x := size.x * 0.5 + lateral * 180.0
	var base_y := size.y - 140.0
	draw_rect(Rect2(x - 44.0, base_y + 68.0, 88.0, 18.0), Color(0.0, 0.0, 0.0, 0.22), true)
	_draw_quad(
		Vector2(x - 54.0, base_y + 74.0),
		Vector2(x - 38.0, base_y),
		Vector2(x + 38.0, base_y),
		Vector2(x + 54.0, base_y + 74.0),
		Color.from_string("#ffd46d", Color.WHITE)
	)
	draw_rect(Rect2(x - 6.0, base_y + 8.0, 12.0, 60.0), Color.from_string("#13213b", Color.WHITE), true)
	draw_rect(Rect2(x - 26.0, base_y + 18.0, 52.0, 20.0), Color.from_string("#12192a", Color.WHITE), true)


func _road_geometry(depth: float, road_curve: float, lateral: float, horizon_y: float, size: Vector2) -> Dictionary:
	var eased := depth * depth
	var y := horizon_y + eased * (size.y - horizon_y)
	var road_half := 64.0 + eased * size.x * 0.39
	var curve_shift := road_curve * (36.0 + eased * 250.0)
	var player_shift := lateral * depth * 95.0
	var center := size.x * 0.5 - curve_shift - player_shift
	return {"y": y, "center": center, "road_half": road_half}


func _draw_quad(a: Vector2, b: Vector2, c: Vector2, d: Vector2, color: Color) -> void:
	var points := PackedVector2Array([a, b, c, d])
	draw_colored_polygon(points, color)


func _mix_palette(from_palette: Dictionary, to_palette: Dictionary, amount: float) -> Dictionary:
	var palette := {}
	for key in from_palette.keys():
		palette[key] = _html_color(str(from_palette[key])).lerp(_html_color(str(to_palette.get(key, from_palette[key]))), amount).to_html()
	return palette


func _html_color(value: String) -> Color:
	return Color.from_string(value, Color.WHITE)
