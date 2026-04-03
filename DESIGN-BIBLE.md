# Redline Horizon Design Bible

`Redline Horizon` should become a stylish horizon racer that blends the road feel and music-forward identity of *Lotus III* with the scenic, branching, fantasy-road energy of *OutRun*.

## Reference deep dive

### Lotus III: The Ultimate Challenge

- strongest lessons:
  - fast, readable road action
  - strong music identity
  - immediate car choice
  - expressive scenery and weather
- borrow:
  - pre-race music/car selection mood
  - focused checkpoint/stage rhythm
  - polished sprite-road clarity

### OutRun

- strongest lessons:
  - the drive is a fantasy, not just a competition
  - branching routes create replayability
  - music selection becomes part of the ritual
- borrow:
  - route splits
  - scenic theme changes
  - strong horizon composition
  - memorable color and environmental variation

## Game design

### Fantasy

Cross a sunlit continent in an elite exotic car, weaving through traffic, choosing routes, and chasing the perfect arcade road trip rather than strict sim-racing authenticity.

### Pillars

- **Scenic speed**: the road should feel like a journey
- **Arcade rhythm**: simple inputs, strong feedback, instant restarts
- **Music ritual**: soundtrack selection is part of the fantasy
- **Route identity**: each branch should feel like a distinct place

### Structure

- five-stage run format
- route branches after stages
- multiple endings
- score and time pressure
- unlockable cars and music tracks

## Game mechanics

### Driving

- lane-based steering with analog softness
- drift-lite snap on wide curves
- slipstream bonus
- weather and time-of-day modifiers
- traffic personality by region

### Stage variety

- coastal highway
- neon city night drive
- alpine storm road
- desert dusk
- forest motorway

### Meta progression

- unlockable routes
- time medals
- music unlocks
- car roster expansion

## Sound design

- loud but clean arcade engine identity
- environmental sweeps: tunnels, rain, seaside wind, traffic wash
- passing traffic should create satisfying whoosh moments
- collisions need consequence without turning the game into a punishment simulator

## Music design

Music is a headline feature here, not a background layer.

### Direction

- bright melodic driving themes
- synth-pop, fusion, and sunset-electronic influences
- player-selected track at run start
- seamless handoff between menu and road where possible

## Tutorials

Keep it almost invisible.

### Early teaching beats

1. open highway and lane control
2. traffic weave
3. route split selection
4. weather modifier
5. checkpoint pressure

## Menus

### Front end

- `Start Drive`
- `Music Select`
- `Car Select`
- `Records`
- `Options`

### Presentation

- the title screen should sell the fantasy immediately
- route map should be stylish and simple
- music select deserves its own visual identity

## Production roadmap

### Next prototype gains

- add route splits
- add stage themes and scenery sets
- add music select framing
- add checkpoint/timer pressure

### Production engine

Godot 4 with a custom sprite-road renderer for the desktop version.

## Visual references

- Lotus III overview: https://www.amigareviews.leveluphost.com/lotus3.htm
- Lotus III graphics archive: https://www.amiga.lychesis.net/games/Lotus3.html
- OutRun overview: https://en.wikipedia.org/wiki/Out_Run
- OutRun feature analysis: https://www.hardcoregaming101.net/outrun/
