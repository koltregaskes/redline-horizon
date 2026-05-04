extends Control

const CONTENT_PATH := "res://data/redline-content.json"
const START_TIMER := 46.0

@onready var road_view: Control = $RoadView
@onready var title_label: Label = $Ui/Panel/VBox/Title
@onready var body_label: Label = $Ui/Panel/VBox/Body
@onready var music_label: Label = $Ui/Panel/VBox/MusicLabel
@onready var route_label: Label = $Ui/Panel/VBox/RouteLabel
@onready var status_label: Label = $Ui/Panel/VBox/StatusLabel
@onready var music_button: Button = $Ui/Panel/VBox/Buttons/MusicButton
@onready var harbor_button: Button = $Ui/Panel/VBox/Buttons/HarborButton
@onready var neon_button: Button = $Ui/Panel/VBox/Buttons/NeonButton
@onready var start_button: Button = $Ui/Panel/VBox/Buttons/StartButton
@onready var reset_button: Button = $Ui/Panel/VBox/Buttons/ResetButton

var content: Dictionary = {}
var stages_by_id: Dictionary = {}
var screen := "title"
var selected_branch := "neon"
var selected_music_index := 0
var distance := 0.0
var timer := START_TIMER
var checkpoint_index := 0
var summary_text := ""
var route_tree: Dictionary = {}
var last_branch_locked := false


func _ready() -> void:
	_load_content()
	music_button.pressed.connect(_on_cycle_music_pressed)
	harbor_button.pressed.connect(_on_harbor_pressed)
	neon_button.pressed.connect(_on_neon_pressed)
	start_button.pressed.connect(_on_start_pressed)
	reset_button.pressed.connect(_on_reset_pressed)
	set_process(true)
	_update_ui()
	_sync_road_view()


func _process(delta: float) -> void:
	if screen != "drive":
		distance = fmod(distance + delta * 120.0, float(route_tree.get("totalDistance", 9200.0)))
		_sync_road_view()
		return

	timer = max(timer - delta, 0.0)
	distance += delta * 176.0
	if not last_branch_locked and distance >= float(route_tree.get("branchDistance", 5050.0)):
		last_branch_locked = true

	var checkpoints: Array = route_tree.get("checkpoints", [])
	if checkpoint_index < checkpoints.size():
		var checkpoint: Dictionary = checkpoints[checkpoint_index]
		if distance >= float(checkpoint.get("distance", 0.0)):
			timer += float(checkpoint.get("bonus", 0.0))
			checkpoint_index += 1

	if timer <= 0.0:
		_finish_run(false)
	elif distance >= float(route_tree.get("totalDistance", 9200.0)):
		_finish_run(true)

	_update_ui()
	_sync_road_view()


func _load_content() -> void:
	var text := FileAccess.get_file_as_string(CONTENT_PATH)
	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("Redline content JSON could not be parsed.")
		return

	content = parsed
	route_tree = content.get("route_tree", {})
	for stage in content.get("stages", []):
		stages_by_id[stage.get("id", "")] = stage


func _on_cycle_music_pressed() -> void:
	var music_packs: Array = content.get("music_packs", [])
	if music_packs.is_empty():
		return
	selected_music_index = (selected_music_index + 1) % music_packs.size()
	_update_ui()


func _on_harbor_pressed() -> void:
	if screen == "drive" and last_branch_locked:
		return
	selected_branch = "harbor"
	_update_ui()
	_sync_road_view()


func _on_neon_pressed() -> void:
	if screen == "drive" and last_branch_locked:
		return
	selected_branch = "neon"
	_update_ui()
	_sync_road_view()


func _on_start_pressed() -> void:
	if screen == "title" or screen == "summary":
		_start_run()
		return
	if screen == "drive":
		_finish_run(timer > 0.0)


func _on_reset_pressed() -> void:
	screen = "title"
	distance = 0.0
	timer = START_TIMER
	checkpoint_index = 0
	last_branch_locked = false
	summary_text = ""
	_update_ui()
	_sync_road_view()


func _start_run() -> void:
	screen = "drive"
	distance = 0.0
	timer = START_TIMER
	checkpoint_index = 0
	last_branch_locked = false
	summary_text = ""
	_update_ui()
	_sync_road_view()


func _finish_run(success: bool) -> void:
	screen = "summary"
	var endings: Dictionary = route_tree.get("endings", {})
	var ending: Dictionary = endings.get(selected_branch, {})
	if success:
		summary_text = "%s\n%s" % [
			ending.get("title", "Run complete"),
			ending.get("postcard", "The skyline opens and the tape gets delivered."),
		]
	else:
		summary_text = "Run lost\nThe checkpoint chain broke before the skyline."
	_update_ui()
	_sync_road_view()


func _update_ui() -> void:
	var music_packs: Array = content.get("music_packs", [])
	var music_pack: Dictionary = {}
	if not music_packs.is_empty():
		music_pack = music_packs[selected_music_index]

	title_label.text = "Redline Horizon Spike"
	music_label.text = "Music: %s\nPreview cue: %s" % [
		music_pack.get("name", "Unknown"),
		music_pack.get("previewCue", "No preview cue"),
	]
	route_label.text = "Branch: %s\nRoute story: %s" % [
		"Harbor Slip" if selected_branch == "harbor" else "Neon Express",
		route_tree.get("story", "No route story loaded."),
	]

	if screen == "title":
		body_label.text = "Godot spike fed by the browser JSON export. Cycle music packs, choose a branch, then start the run."
		status_label.text = "Start reproduces one stage flow, one route choice, one music selection loop, and one summary state."
		start_button.text = "Start Run"
	elif screen == "drive":
		var checkpoint_total = route_tree.get("checkpoints", [])
		body_label.text = "Distance %.0f / %.0f\nTimer %.1f\nCheckpoint %d / %d" % [
			distance,
			float(route_tree.get("totalDistance", 9200.0)),
			timer,
			checkpoint_index,
			checkpoint_total.size(),
		]
		status_label.text = "Branch locked: %s" % ("Yes" if last_branch_locked else "No - switch while the split is still ahead")
		start_button.text = "Force Finish"
	else:
		body_label.text = summary_text
		status_label.text = "Reset returns to the title state. Start runs the route again with the current branch and music selection."
		start_button.text = "Run Again"

	harbor_button.disabled = screen == "drive" and last_branch_locked
	neon_button.disabled = screen == "drive" and last_branch_locked


func _sync_road_view() -> void:
	if content.is_empty():
		return
	var segment_state := _find_segment(distance)
	road_view.call(
		"set_runtime_state",
		{
			"stage": segment_state["current"],
			"next_stage": segment_state["next"],
			"transition": segment_state["transition"],
			"distance": distance,
			"lateral": -0.18 if selected_branch == "harbor" else 0.18,
			"road_curve": sin(distance * 0.0012) * 0.5,
			"screen": screen,
		}
	)


func _find_segment(run_distance: float) -> Dictionary:
	var stages: Array = []
	for stage_node in route_tree.get("stageOrder", []):
		if stage_node.get("branch", "all") == "all" or stage_node.get("branch", "all") == selected_branch:
			stages.append(stages_by_id.get(stage_node.get("stageId", ""), {}))

	var current_index := stages.size() - 1
	for index in range(stages.size()):
		var stage: Dictionary = stages[index]
		if run_distance >= float(stage.get("start", 0.0)) and run_distance < float(stage.get("end", 0.0)):
			current_index = index
			break

	var current: Dictionary = stages[current_index]
	var next_stage: Dictionary = stages[min(current_index + 1, stages.size() - 1)]
	var transition_window := 420.0
	var transition_start := max(float(current.get("end", 0.0)) - transition_window, float(current.get("start", 0.0)))
	var transition := 0.0
	if current.get("id", "") != next_stage.get("id", ""):
		transition = clamp((run_distance - transition_start) / max(float(current.get("end", 0.0)) - transition_start, 1.0), 0.0, 1.0)

	return {
		"current": current,
		"next": next_stage,
		"transition": transition,
	}
