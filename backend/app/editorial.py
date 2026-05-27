"""
Curated cross-artist mapping system for Music Matrix.
Hand-crafted editorial bridges connecting Taylor Swift songs to other artists,
plus era-based artist mappings and mood categorizations.
"""

from typing import List, Dict, Optional


EDITORIAL_BRIDGES = {
    "Tim McGraw": [
        {
            "artist": "Kacey Musgraves",
            "song": "Follow Your Arrow",
            "reason": "Both capture that wide-eyed small-town yearning with a voice that knows it's about to outgrow the county line",
            "mood": "nostalgia",
            "era_connection": "Taylor Swift",
        },
        {
            "artist": "Maggie Rogers",
            "song": "Alaska",
            "reason": "The same rush of a memory so vivid it becomes its own landscape — music as geography of the heart",
            "mood": "nostalgia",
            "era_connection": "Taylor Swift",
        },
    ],
    "Teardrops On My Guitar": [
        {
            "artist": "Olivia Rodrigo",
            "song": "drivers license",
            "reason": "Teenage heartbreak distilled to its purest form — crying in private about someone who doesn't know they're the subject",
            "mood": "heartbreak",
            "era_connection": "Taylor Swift",
        },
        {
            "artist": "Gracie Abrams",
            "song": "I miss you, I'm sorry",
            "reason": "Both are whispered confessions disguised as diary entries, quiet devastation wearing a brave face",
            "mood": "heartbreak",
            "era_connection": "Taylor Swift",
        },
    ],
    "Love Story": [
        {
            "artist": "Lana Del Rey",
            "song": "Young and Beautiful",
            "reason": "Romeo-and-Juliet romanticism filtered through different decades — one sun-drenched, one noir — both achingly earnest",
            "mood": "romantic",
            "era_connection": "Fearless",
        },
        {
            "artist": "HAIM",
            "song": "Summer Girl",
            "reason": "Golden-hour love songs built on the belief that devotion can rewrite the ending",
            "mood": "romantic",
            "era_connection": "Fearless",
        },
    ],
    "You Belong With Me": [
        {
            "artist": "Carly Rae Jepsen",
            "song": "Call Me Maybe",
            "reason": "The purest distillation of pop longing — both songs make unrequited love feel like a superpower",
            "mood": "romantic",
            "era_connection": "Fearless",
        },
        {
            "artist": "Paramore",
            "song": "Still Into You",
            "reason": "Anthemic declarations of love that refuse to be embarrassed about how much they feel",
            "mood": "euphoria",
            "era_connection": "Fearless",
        },
    ],
    "Fifteen": [
        {
            "artist": "Lucy Dacus",
            "song": "Night Shift",
            "reason": "Both songs are letters to a younger self about the lessons that only come from living through the pain",
            "mood": "nostalgia",
            "era_connection": "Fearless",
        },
        {
            "artist": "Phoebe Bridgers",
            "song": "Funeral",
            "reason": "The specific grief of realizing you're not a kid anymore, told with devastating gentleness",
            "mood": "melancholy",
            "era_connection": "Fearless",
        },
    ],
    "Mine": [
        {
            "artist": "Bleachers",
            "song": "I Wanna Get Better",
            "reason": "Both build from vulnerability to euphoria — the moment you realize love might actually work this time",
            "mood": "euphoria",
            "era_connection": "Speak Now",
        },
        {
            "artist": "HAIM",
            "song": "Want You Back",
            "reason": "Propulsive declarations of love that sprint forward with open arms and zero reservations",
            "mood": "romantic",
            "era_connection": "Speak Now",
        },
    ],
    "Back to December": [
        {
            "artist": "Adele",
            "song": "Someone Like You",
            "reason": "Both are rare apology songs — not asking for forgiveness, just acknowledging the damage with open hands",
            "mood": "heartbreak",
            "era_connection": "Speak Now",
        },
        {
            "artist": "Bon Iver",
            "song": "Skinny Love",
            "reason": "Winter as metaphor for regret — both songs shiver with the cold of knowing you let something beautiful die",
            "mood": "melancholy",
            "era_connection": "Speak Now",
        },
    ],
    "Mean": [
        {
            "artist": "Paramore",
            "song": "Ain't It Fun",
            "reason": "Defiant anthems that turn cruelty into rocket fuel — the best revenge is becoming undeniable",
            "mood": "empowerment",
            "era_connection": "Speak Now",
        },
        {
            "artist": "Kacey Musgraves",
            "song": "Biscuits",
            "reason": "Country-rooted kiss-offs delivered with a smile sharp enough to cut glass",
            "mood": "empowerment",
            "era_connection": "Speak Now",
        },
    ],
    "Sparks Fly": [
        {
            "artist": "Carly Rae Jepsen",
            "song": "Run Away With Me",
            "reason": "Fireworks-in-the-chest pop perfection — both songs physically feel like falling in love at terminal velocity",
            "mood": "euphoria",
            "era_connection": "Speak Now",
        },
        {
            "artist": "CHVRCHES",
            "song": "The Mother We Share",
            "reason": "Shimmering synth-adjacent energy that makes your heart race with the thrill of connection",
            "mood": "euphoria",
            "era_connection": "Speak Now",
        },
    ],
    "Enchanted": [
        {
            "artist": "Florence + The Machine",
            "song": "Cosmic Love",
            "reason": "The universe rearranging itself around a single encounter — both songs make meeting someone feel like a celestial event",
            "mood": "romantic",
            "era_connection": "Speak Now",
        },
        {
            "artist": "Imogen Heap",
            "song": "Hide and Seek",
            "reason": "Ethereal wonder at the fragility of a perfect moment — both songs exist in the held breath before a kiss",
            "mood": "romantic",
            "era_connection": "Speak Now",
        },
        {
            "artist": "The 1975",
            "song": "Somebody Else",
            "reason": "The intoxication of a first meeting haunted by the premonition of eventual loss",
            "mood": "romantic",
            "era_connection": "Speak Now",
        },
    ],
    "We Are Never Getting Back Together": [
        {
            "artist": "Robyn",
            "song": "Dancing On My Own",
            "reason": "Pop catharsis at its finest — dancing through the wreckage with mascara running and fists raised",
            "mood": "empowerment",
            "era_connection": "Red",
        },
        {
            "artist": "Charli XCX",
            "song": "Break The Rules",
            "reason": "Chaotic, gleeful rejection of someone who tried to make you smaller",
            "mood": "empowerment",
            "era_connection": "Red",
        },
    ],
    "I Knew You Were Trouble": [
        {
            "artist": "Amy Winehouse",
            "song": "Back to Black",
            "reason": "Walking into disaster with eyes wide open — both songs know the fire will burn but reach for it anyway",
            "mood": "heartbreak",
            "era_connection": "Red",
        },
        {
            "artist": "Billie Eilish",
            "song": "bad guy",
            "reason": "Self-aware songs about the magnetic pull of people you know are wrong for you",
            "mood": "rage",
            "era_connection": "Red",
        },
    ],
    "22": [
        {
            "artist": "Carly Rae Jepsen",
            "song": "I Really Like You",
            "reason": "Sugar-rush pop joy that makes your age feel like a superpower and the night feel infinite",
            "mood": "euphoria",
            "era_connection": "Red",
        },
        {
            "artist": "Charli XCX",
            "song": "Boom Clap",
            "reason": "Carefree pop energy that captures the electricity of being young and invincible",
            "mood": "euphoria",
            "era_connection": "Red",
        },
    ],
    "Everything Has Changed": [
        {
            "artist": "The 1975",
            "song": "Me & You Together Song",
            "reason": "That butterflies-and-sunshine feeling of early love when everything looks different because someone new is in the frame",
            "mood": "romantic",
            "era_connection": "Red",
        },
        {
            "artist": "Vampire Weekend",
            "song": "Harmony Hall",
            "reason": "Both find joy in the transformation that comes when someone rearranges your world without asking",
            "mood": "romantic",
            "era_connection": "Red",
        },
    ],
    "All Too Well": [
        {
            "artist": "James Blake",
            "song": "Retrograde",
            "reason": "Both build from quiet devastation to overwhelming catharsis — the kind of songs that make time stop",
            "mood": "heartbreak",
            "era_connection": "Red",
        },
        {
            "artist": "Phoebe Bridgers",
            "song": "I Know the End",
            "reason": "Masterclass in emotional escalation — starting as a whisper and ending as a scream that shakes the foundations",
            "mood": "heartbreak",
            "era_connection": "Red",
        },
        {
            "artist": "Bon Iver",
            "song": "re: Stacks",
            "reason": "Both live in the aftermath — sorting through the wreckage of a love that redefined you, finding poetry in the ruins",
            "mood": "heartbreak",
            "era_connection": "Red",
        },
        {
            "artist": "Joni Mitchell",
            "song": "A Case of You",
            "reason": "The definitive 'I remember everything' songs — love as an act of total, devastating recall",
            "mood": "heartbreak",
            "era_connection": "Red",
        },
        {
            "artist": "Sufjan Stevens",
            "song": "Fourth of July",
            "reason": "Grief rendered in such specific detail it becomes universal — both songs are cathedrals built from memory",
            "mood": "melancholy",
            "era_connection": "Red",
        },
    ],
    "Red": [
        {
            "artist": "Florence + The Machine",
            "song": "Ship to Wreck",
            "reason": "Love as a spectrum of contradictions — both songs feel like every emotion happening simultaneously",
            "mood": "heartbreak",
            "era_connection": "Red",
        },
        {
            "artist": "Hozier",
            "song": "Cherry Wine",
            "reason": "Both paint love in vivid, conflicting colors — beautiful and devastating in the same brushstroke",
            "mood": "melancholy",
            "era_connection": "Red",
        },
    ],
    "Begin Again": [
        {
            "artist": "Maggie Rogers",
            "song": "Light On",
            "reason": "Tentative hope after heartbreak — both songs are the first deep breath after drowning",
            "mood": "nostalgia",
            "era_connection": "Red",
        },
        {
            "artist": "Japanese Breakfast",
            "song": "Be Sweet",
            "reason": "The courage to try again, to walk into a cafe or a new chapter with cautious optimism",
            "mood": "romantic",
            "era_connection": "Red",
        },
    ],
    "State of Grace": [
        {
            "artist": "The National",
            "song": "Bloodbuzz Ohio",
            "reason": "Both open with an arena-sized rush — the overwhelming feeling of something massive beginning",
            "mood": "euphoria",
            "era_connection": "Red",
        },
        {
            "artist": "Florence + The Machine",
            "song": "Dog Days Are Over",
            "reason": "Anthemic joy that breaks through sorrow like sunlight through storm clouds",
            "mood": "euphoria",
            "era_connection": "Red",
        },
    ],
    "Treacherous": [
        {
            "artist": "Mazzy Star",
            "song": "Fade Into You",
            "reason": "Both songs know the slope is slippery and walk toward the edge anyway — desire as gravity",
            "mood": "romantic",
            "era_connection": "Red",
        },
        {
            "artist": "Cigarettes After Sex",
            "song": "Apocalypse",
            "reason": "Slow-burning desire that treats risk as foreplay — both songs make danger feel like silk",
            "mood": "romantic",
            "era_connection": "Red",
        },
    ],
    "Shake It Off": [
        {
            "artist": "Robyn",
            "song": "Call Your Girlfriend",
            "reason": "Unstoppable pop momentum that turns pain into movement — your body decides before your brain does",
            "mood": "empowerment",
            "era_connection": "1989",
        },
        {
            "artist": "Charli XCX",
            "song": "1999",
            "reason": "Pure serotonin pop that weaponizes joy against anyone who ever doubted you",
            "mood": "euphoria",
            "era_connection": "1989",
        },
    ],
    "Blank Space": [
        {
            "artist": "Lana Del Rey",
            "song": "National Anthem",
            "reason": "Both reclaim the 'crazy girlfriend' narrative and turn it into performance art — self-awareness as the sharpest weapon",
            "mood": "empowerment",
            "era_connection": "1989",
        },
        {
            "artist": "Arctic Monkeys",
            "song": "Do I Wanna Know?",
            "reason": "Both songs are seduction scenes where the seducer knows exactly how this ends — danger with a smirk",
            "mood": "introspective",
            "era_connection": "1989",
        },
        {
            "artist": "Billie Eilish",
            "song": "you should see me in a crown",
            "reason": "Weaponized persona — both lean into villainy with a wink and a razor-sharp chorus",
            "mood": "empowerment",
            "era_connection": "1989",
        },
    ],
    "Style": [
        {
            "artist": "The 1975",
            "song": "The Sound",
            "reason": "Both are chrome-plated pop perfection about a love that keeps coming back in waves no matter how many times it crashes",
            "mood": "romantic",
            "era_connection": "1989",
        },
        {
            "artist": "Harry Styles",
            "song": "Adore You",
            "reason": "Shimmering pop about a love that never really goes out of fashion — classic, inevitable, eternal",
            "mood": "romantic",
            "era_connection": "1989",
        },
        {
            "artist": "Tame Impala",
            "song": "The Less I Know the Better",
            "reason": "Both capture the magnetic pull of someone you keep circling back to — style and obsession intertwined",
            "mood": "romantic",
            "era_connection": "1989",
        },
    ],
    "Bad Blood": [
        {
            "artist": "Paramore",
            "song": "Misery Business",
            "reason": "Adrenaline-fueled declarations of war that turn betrayal into an anthem",
            "mood": "rage",
            "era_connection": "1989",
        },
        {
            "artist": "Hayley Williams",
            "song": "Dead Horse",
            "reason": "Both process the dissolution of a friendship with the intensity others reserve for romance",
            "mood": "rage",
            "era_connection": "1989",
        },
    ],
    "Wildest Dreams": [
        {
            "artist": "Lana Del Rey",
            "song": "Summertime Sadness",
            "reason": "Cinematic love affairs designed to be memorialized — both are the golden-hour movie playing behind your closed eyes",
            "mood": "nostalgia",
            "era_connection": "1989",
        },
        {
            "artist": "Beach House",
            "song": "Space Song",
            "reason": "Dream-pop reveries about love as something beautiful precisely because it's fleeting",
            "mood": "melancholy",
            "era_connection": "1989",
        },
        {
            "artist": "The Weeknd",
            "song": "Die For You",
            "reason": "Both are sweeping romantic declarations that know the dream is almost too perfect to survive",
            "mood": "romantic",
            "era_connection": "1989",
        },
    ],
    "Out of the Woods": [
        {
            "artist": "CHVRCHES",
            "song": "Clearest Blue",
            "reason": "Synth-driven anxiety spirals that somehow become euphoric — running from danger toward the light",
            "mood": "introspective",
            "era_connection": "1989",
        },
        {
            "artist": "Bleachers",
            "song": "Rollercoaster",
            "reason": "Both songs sprint breathlessly through a relationship's highlight reel, desperate to outrun the ending",
            "mood": "nostalgia",
            "era_connection": "1989",
        },
    ],
    "Clean": [
        {
            "artist": "Florence + The Machine",
            "song": "What Kind of Man",
            "reason": "The moment addiction to a person finally breaks — both songs are baptisms by fire and water",
            "mood": "empowerment",
            "era_connection": "1989",
        },
        {
            "artist": "Mitski",
            "song": "Washing Machine Heart",
            "reason": "Both use water as metaphor for cleansing and renewal after being consumed by someone",
            "mood": "melancholy",
            "era_connection": "1989",
        },
    ],
    "Welcome to New York": [
        {
            "artist": "Bleachers",
            "song": "Don't Take the Money",
            "reason": "Both are love letters to reinvention — the electric feeling of becoming someone new in a city of strangers",
            "mood": "euphoria",
            "era_connection": "1989",
        },
    ],
    "Look What You Made Me Do": [
        {
            "artist": "Billie Eilish",
            "song": "bury a friend",
            "reason": "Both weaponize their own villain arc — darkness as armor, menace as art",
            "mood": "rage",
            "era_connection": "reputation",
        },
        {
            "artist": "Fiona Apple",
            "song": "Criminal",
            "reason": "Both confront the public's narrative head-on and twist it into something dangerous and self-possessed",
            "mood": "empowerment",
            "era_connection": "reputation",
        },
    ],
    "...Ready For It?": [
        {
            "artist": "The Weeknd",
            "song": "Blinding Lights",
            "reason": "Dark, pulsing energy with a romantic undertow — both songs make desire feel like a high-speed chase",
            "mood": "euphoria",
            "era_connection": "reputation",
        },
        {
            "artist": "Charli XCX",
            "song": "Vroom Vroom",
            "reason": "Both are pedal-to-the-floor adrenaline rushes disguised as love songs",
            "mood": "empowerment",
            "era_connection": "reputation",
        },
    ],
    "Delicate": [
        {
            "artist": "The 1975",
            "song": "Robbers",
            "reason": "Both strip away the armor to reveal the terrifying vulnerability underneath — falling in love when the world is watching",
            "mood": "romantic",
            "era_connection": "reputation",
        },
        {
            "artist": "Frank Ocean",
            "song": "Thinkin Bout You",
            "reason": "The quiet terror of catching feelings when you've built walls — both songs tremble with exposed nerve endings",
            "mood": "romantic",
            "era_connection": "reputation",
        },
        {
            "artist": "Japanese Breakfast",
            "song": "Diving Woman",
            "reason": "Both explore the risk of vulnerability — asking if it's safe to be soft when everything else is hard",
            "mood": "introspective",
            "era_connection": "reputation",
        },
    ],
    "Getaway Car": [
        {
            "artist": "Fleetwood Mac",
            "song": "The Chain",
            "reason": "Both are about relationships built on escape — thrilling while the engine runs, devastating when it stops",
            "mood": "heartbreak",
            "era_connection": "reputation",
        },
        {
            "artist": "Lorde",
            "song": "Green Light",
            "reason": "Both capture the exhilarating wreckage of leaving — running from love in a blaze of pop glory",
            "mood": "empowerment",
            "era_connection": "reputation",
        },
        {
            "artist": "Sabrina Carpenter",
            "song": "Nonsense",
            "reason": "Both turn messy romantic situations into irresistible pop confections with a mischievous grin",
            "mood": "euphoria",
            "era_connection": "reputation",
        },
    ],
    "New Year's Day": [
        {
            "artist": "The National",
            "song": "Slow Show",
            "reason": "Both are quiet pledges of forever amid the chaos — choosing to stay when the party ends and the real work begins",
            "mood": "romantic",
            "era_connection": "reputation",
        },
        {
            "artist": "Sufjan Stevens",
            "song": "Mystery of Love",
            "reason": "Tender, patient love songs that trust the listener with something fragile and true",
            "mood": "romantic",
            "era_connection": "reputation",
        },
    ],
    "Cruel Summer": [
        {
            "artist": "Lorde",
            "song": "Supercut",
            "reason": "Both are memory as a highlight reel of longing — summer love distilled to its most agonizing, intoxicating essence",
            "mood": "euphoria",
            "era_connection": "Lover",
        },
        {
            "artist": "HAIM",
            "song": "The Steps",
            "reason": "Both are propulsive, breathless songs about love that's burning too hot too fast — running toward the fire",
            "mood": "euphoria",
            "era_connection": "Lover",
        },
        {
            "artist": "Tame Impala",
            "song": "Let It Happen",
            "reason": "Both capture the moment of surrender — the bridge where you stop fighting and let the feeling drown you",
            "mood": "euphoria",
            "era_connection": "Lover",
        },
    ],
    "Lover": [
        {
            "artist": "Harry Styles",
            "song": "Golden",
            "reason": "Sunlit devotion that makes forever feel effortless — both songs are the warm hand you reach for in the dark",
            "mood": "romantic",
            "era_connection": "Lover",
        },
        {
            "artist": "Kacey Musgraves",
            "song": "Butterflies",
            "reason": "Both strip romance to its most genuine core — no games, no armor, just two people choosing each other",
            "mood": "romantic",
            "era_connection": "Lover",
        },
    ],
    "The Man": [
        {
            "artist": "HAIM",
            "song": "Don't Wanna",
            "reason": "Both call out double standards with wit and a beat that makes the critique dance-floor ready",
            "mood": "empowerment",
            "era_connection": "Lover",
        },
        {
            "artist": "Fiona Apple",
            "song": "Fetch the Bolt Cutters",
            "reason": "Both dismantle patriarchal expectations — one with a pop sheen, one with feral intensity",
            "mood": "empowerment",
            "era_connection": "Lover",
        },
    ],
    "ME!": [
        {
            "artist": "Carly Rae Jepsen",
            "song": "Cut to the Feeling",
            "reason": "Effervescent self-celebration that turns confidence into confetti — pure joy as a political act",
            "mood": "euphoria",
            "era_connection": "Lover",
        },
    ],
    "You Need To Calm Down": [
        {
            "artist": "Hayley Williams",
            "song": "Simmer",
            "reason": "Both address rage directed at them — one deflects with humor, the other channels it inward, both refuse to shrink",
            "mood": "empowerment",
            "era_connection": "Lover",
        },
        {
            "artist": "Lizzo",
            "song": "Juice",
            "reason": "Both weaponize joy and self-assurance against haters — unbothered anthems for the chronically targeted",
            "mood": "empowerment",
            "era_connection": "Lover",
        },
    ],
    "The Archer": [
        {
            "artist": "Radiohead",
            "song": "No Surprises",
            "reason": "Both are quiet confessions of self-sabotage wrapped in deceptively gentle production — the softest cry for help",
            "mood": "introspective",
            "era_connection": "Lover",
        },
        {
            "artist": "Big Thief",
            "song": "Not",
            "reason": "Both unfold their defenses layer by layer, revealing the fear that lives beneath every relationship",
            "mood": "introspective",
            "era_connection": "Lover",
        },
        {
            "artist": "Phoebe Bridgers",
            "song": "Garden Song",
            "reason": "Both sit with vulnerability instead of running from it — therapy sessions disguised as songs",
            "mood": "introspective",
            "era_connection": "Lover",
        },
    ],
    "cardigan": [
        {
            "artist": "Bon Iver",
            "song": "Holocene",
            "reason": "Both exist in the liminal space between memory and myth — love stories told as if they happened in another century",
            "mood": "nostalgia",
            "era_connection": "folklore",
        },
        {
            "artist": "Big Thief",
            "song": "Masterpiece",
            "reason": "Both take a single worn object and use it to excavate an entire relationship's emotional geography",
            "mood": "melancholy",
            "era_connection": "folklore",
        },
        {
            "artist": "The National",
            "song": "About Today",
            "reason": "Both build slowly from a whisper to something devastating — the quiet erosion of love rendered in real time",
            "mood": "heartbreak",
            "era_connection": "folklore",
        },
    ],
    "exile": [
        {
            "artist": "The National",
            "song": "Terrible Love",
            "reason": "Both are duets between two people who love each other but speak different emotional languages — parallel monologues of grief",
            "mood": "heartbreak",
            "era_connection": "folklore",
        },
        {
            "artist": "James Blake",
            "song": "Limit to Your Love",
            "reason": "Both explore the chasm between two people in the same room — love as failed translation",
            "mood": "heartbreak",
            "era_connection": "folklore",
        },
    ],
    "the 1": [
        {
            "artist": "Lorde",
            "song": "Liability",
            "reason": "Both rewrite the breakup narrative without bitterness — grief processed into something almost peaceful",
            "mood": "nostalgia",
            "era_connection": "folklore",
        },
        {
            "artist": "Frank Ocean",
            "song": "Self Control",
            "reason": "Both mourn the alternate timeline where things worked out — love letters to parallel universes",
            "mood": "melancholy",
            "era_connection": "folklore",
        },
    ],
    "august": [
        {
            "artist": "Mazzy Star",
            "song": "Look on Down from the Bridge",
            "reason": "Both live inside the dying light of a summer that was never yours to keep — loving someone else's person",
            "mood": "heartbreak",
            "era_connection": "folklore",
        },
        {
            "artist": "Cigarettes After Sex",
            "song": "Each Time You Fall in Love",
            "reason": "Both are songs for the one who was never chosen — desire as something borrowed, never owned",
            "mood": "melancholy",
            "era_connection": "folklore",
        },
        {
            "artist": "SZA",
            "song": "The Weekend",
            "reason": "Both capture the ache of being the secret — summer as a metaphor for stolen, impermanent love",
            "mood": "heartbreak",
            "era_connection": "folklore",
        },
    ],
    "betty": [
        {
            "artist": "Vampire Weekend",
            "song": "Hannah Hunt",
            "reason": "Both capture the desperate urgency of showing up at someone's door and betting everything on one conversation",
            "mood": "romantic",
            "era_connection": "folklore",
        },
        {
            "artist": "Arctic Monkeys",
            "song": "505",
            "reason": "Both are breathless races back to someone — the teenage-movie moment of choosing love over pride",
            "mood": "romantic",
            "era_connection": "folklore",
        },
    ],
    "my tears ricochet": [
        {
            "artist": "Florence + The Machine",
            "song": "Seven Devils",
            "reason": "Both channel betrayal into something spectral and haunting — ghosts who refuse to leave the house they built",
            "mood": "rage",
            "era_connection": "folklore",
        },
        {
            "artist": "Mitski",
            "song": "A Pearl",
            "reason": "Both transform pain into something ornate and inescapable — grief as an inheritance you can never spend",
            "mood": "heartbreak",
            "era_connection": "folklore",
        },
    ],
    "illicit affairs": [
        {
            "artist": "Hozier",
            "song": "Work Song",
            "reason": "Both understand that forbidden love has its own liturgy — worship in whispers and parking lots",
            "mood": "melancholy",
            "era_connection": "folklore",
        },
        {
            "artist": "The Cranberries",
            "song": "Linger",
            "reason": "Both capture the specific ache of a love that exists only in stolen moments — beauty tangled with shame",
            "mood": "heartbreak",
            "era_connection": "folklore",
        },
    ],
    "invisible string": [
        {
            "artist": "Sufjan Stevens",
            "song": "The Predatory Wasp of the Palisades Is Out of Control",
            "reason": "Both trace fate backward through time — finding the invisible threads that connected you long before you met",
            "mood": "romantic",
            "era_connection": "folklore",
        },
        {
            "artist": "Iron & Wine",
            "song": "Flightless Bird, American Mouth",
            "reason": "Both are songs about destiny that feel handwritten on parchment — fate as something gentle, not grand",
            "mood": "romantic",
            "era_connection": "folklore",
        },
    ],
    "seven": [
        {
            "artist": "Sufjan Stevens",
            "song": "Casimir Pulaski Day",
            "reason": "Both are devastating in their innocence — childhood memories preserved in amber, fragile and exact",
            "mood": "nostalgia",
            "era_connection": "folklore",
        },
        {
            "artist": "Julien Baker",
            "song": "Appointments",
            "reason": "Both find the sacred in childhood's simplicity — memories so tender they ache",
            "mood": "nostalgia",
            "era_connection": "folklore",
        },
    ],
    "this is me trying": [
        {
            "artist": "The National",
            "song": "Graceless",
            "reason": "Both are anthems for the barely-holding-it-together — the heroism of just showing up when everything hurts",
            "mood": "melancholy",
            "era_connection": "folklore",
        },
        {
            "artist": "Phoebe Bridgers",
            "song": "Chinese Satellite",
            "reason": "Both capture the exhaustion of trying to believe in something — yourself, God, another person — when evidence is thin",
            "mood": "introspective",
            "era_connection": "folklore",
        },
        {
            "artist": "boygenius",
            "song": "Not Strong Enough",
            "reason": "Both are raw confessions from people who feel they're failing at being human — beautiful in their brokenness",
            "mood": "melancholy",
            "era_connection": "folklore",
        },
    ],
    "peace": [
        {
            "artist": "Bon Iver",
            "song": "Wash.",
            "reason": "Both ask whether love can survive the person you actually are — vulnerability as offering, imperfection as gift",
            "mood": "introspective",
            "era_connection": "folklore",
        },
        {
            "artist": "Adrianne Lenker",
            "song": "anything",
            "reason": "Both are love songs that confess their own inadequacy — devotion tangled with the fear of not being enough",
            "mood": "romantic",
            "era_connection": "folklore",
        },
    ],
    "willow": [
        {
            "artist": "Imogen Heap",
            "song": "Just for Now",
            "reason": "Both weave spells with layered vocals and mystical production — enchantment as sonic texture",
            "mood": "romantic",
            "era_connection": "evermore",
        },
        {
            "artist": "Kate Bush",
            "song": "Running Up That Hill",
            "reason": "Both are songs about surrendering to an unstoppable gravitational pull — desire as witchcraft",
            "mood": "romantic",
            "era_connection": "evermore",
        },
    ],
    "champagne problems": [
        {
            "artist": "Adele",
            "song": "All I Ask",
            "reason": "Both are devastating studies of a moment where love wasn't enough — champagne going flat, candles burning down",
            "mood": "heartbreak",
            "era_connection": "evermore",
        },
        {
            "artist": "Radiohead",
            "song": "Exit Music (For a Film)",
            "reason": "Both are quiet catastrophes — the piano-led devastation of watching something precious shatter in slow motion",
            "mood": "heartbreak",
            "era_connection": "evermore",
        },
        {
            "artist": "Julien Baker",
            "song": "Hardline",
            "reason": "Both explore the guilt of being unable to accept what's offered — the cruelty of honest inability",
            "mood": "heartbreak",
            "era_connection": "evermore",
        },
    ],
    "no body no crime": [
        {
            "artist": "Fleetwood Mac",
            "song": "Gold Dust Woman",
            "reason": "Both are murder mysteries wrapped in velvet — the gothic underbelly of seemingly perfect lives",
            "mood": "rage",
            "era_connection": "evermore",
        },
        {
            "artist": "Kacey Musgraves",
            "song": "High Horse",
            "reason": "Both have that sly, knowing country storytelling where every detail is a clue and every verse turns the knife",
            "mood": "empowerment",
            "era_connection": "evermore",
        },
    ],
    "tolerate it": [
        {
            "artist": "Fiona Apple",
            "song": "Paper Bag",
            "reason": "Both are songs about slowly realizing you're performing devotion for an audience of one who isn't watching",
            "mood": "heartbreak",
            "era_connection": "evermore",
        },
        {
            "artist": "Lucy Dacus",
            "song": "Thumbs",
            "reason": "Both find the specific devastation in being tolerated rather than celebrated — quiet rage at conditional love",
            "mood": "melancholy",
            "era_connection": "evermore",
        },
    ],
    "happiness": [
        {
            "artist": "Big Thief",
            "song": "Cattails",
            "reason": "Both hold contradictions gently — grief and gratitude for the same person, the same years, the same ending",
            "mood": "introspective",
            "era_connection": "evermore",
        },
        {
            "artist": "Bon Iver",
            "song": "715 - CRΣΣKS",
            "reason": "Both exist in the space after the crying stops — the eerie calm of accepting that happiness existed and ended",
            "mood": "melancholy",
            "era_connection": "evermore",
        },
    ],
    "gold rush": [
        {
            "artist": "Lorde",
            "song": "The Louvre",
            "reason": "Both are about desiring someone so universally wanted that it feels like competing for a masterpiece",
            "mood": "romantic",
            "era_connection": "evermore",
        },
        {
            "artist": "Harry Styles",
            "song": "Falling",
            "reason": "Both are fantasies about someone just out of reach — the beautiful torture of wanting what everyone wants",
            "mood": "melancholy",
            "era_connection": "evermore",
        },
    ],
    "'tis the damn season": [
        {
            "artist": "Maggie Rogers",
            "song": "Overnight",
            "reason": "Both capture the specific nostalgia of going home and falling back into someone you left behind — geography as heartbreak",
            "mood": "nostalgia",
            "era_connection": "evermore",
        },
        {
            "artist": "The 1975",
            "song": "A Change of Heart",
            "reason": "Both are about the hometown love who represents the road not taken — nostalgia wearing a borrowed coat",
            "mood": "nostalgia",
            "era_connection": "evermore",
        },
    ],
    "ivy": [
        {
            "artist": "Hozier",
            "song": "From Eden",
            "reason": "Both are forbidden love poems where nature becomes the language of desire — vines and gardens and things that grow in secret",
            "mood": "romantic",
            "era_connection": "evermore",
        },
        {
            "artist": "Florence + The Machine",
            "song": "Hunger",
            "reason": "Both treat desire as something that devours — love as invasive species, beautiful and destructive",
            "mood": "romantic",
            "era_connection": "evermore",
        },
    ],
    "long story short": [
        {
            "artist": "Paramore",
            "song": "Hard Times",
            "reason": "Both turn survival into a dance — recapping trauma with a beat that insists on moving forward",
            "mood": "empowerment",
            "era_connection": "evermore",
        },
        {
            "artist": "Bleachers",
            "song": "How Dare You Want More",
            "reason": "Both are breathless recaps of hard-won wisdom — summarizing years of pain in three minutes of catharsis",
            "mood": "empowerment",
            "era_connection": "evermore",
        },
    ],
    "Anti-Hero": [
        {
            "artist": "Mitski",
            "song": "Nobody",
            "reason": "Both turn self-loathing into a banger — the loneliest feelings set to the catchiest melodies, a trick only the greats can pull off",
            "mood": "introspective",
            "era_connection": "Midnights",
        },
        {
            "artist": "Radiohead",
            "song": "Creep",
            "reason": "Both are anthems of not belonging in your own life — universalizing alienation into something everyone hums",
            "mood": "introspective",
            "era_connection": "Midnights",
        },
        {
            "artist": "Olivia Rodrigo",
            "song": "brutal",
            "reason": "Both make self-awareness the hook — naming your own flaws before anyone else can, set to production that slaps",
            "mood": "introspective",
            "era_connection": "Midnights",
        },
    ],
    "Lavender Haze": [
        {
            "artist": "Tame Impala",
            "song": "New Person, Same Old Mistakes",
            "reason": "Both create a haze of sound that mirrors the haze of new love — synth-drenched cocoons against the outside world",
            "mood": "romantic",
            "era_connection": "Midnights",
        },
        {
            "artist": "SZA",
            "song": "Kiss Me More",
            "reason": "Both float in that intoxicated, purple-lit space where love makes everything else background noise",
            "mood": "romantic",
            "era_connection": "Midnights",
        },
    ],
    "Midnight Rain": [
        {
            "artist": "Frank Ocean",
            "song": "Ivy",
            "reason": "Both are about choosing ambition over safety — the person who needed chaos more than they needed love",
            "mood": "melancholy",
            "era_connection": "Midnights",
        },
        {
            "artist": "Lorde",
            "song": "Hard Feelings/Loveless",
            "reason": "Both dissect the moment you realize you want different things — the fork in the road played back at 3AM",
            "mood": "melancholy",
            "era_connection": "Midnights",
        },
    ],
    "Snow on the Beach": [
        {
            "artist": "Beach House",
            "song": "Myth",
            "reason": "Both capture the unreality of falling in love — that disorienting wonder when something impossible starts happening",
            "mood": "romantic",
            "era_connection": "Midnights",
        },
        {
            "artist": "Cigarettes After Sex",
            "song": "Heavenly",
            "reason": "Both are dream-states where love feels like a weather event — rare, quiet, and impossible to explain",
            "mood": "romantic",
            "era_connection": "Midnights",
        },
    ],
    "Maroon": [
        {
            "artist": "Amy Winehouse",
            "song": "Love Is a Losing Game",
            "reason": "Both paint love in its darkest shade — not red but maroon, bruised and wine-stained and impossible to wash out",
            "mood": "heartbreak",
            "era_connection": "Midnights",
        },
        {
            "artist": "James Blake",
            "song": "Say What You Will",
            "reason": "Both use color as emotional shorthand for love that stains — both are bruises examined under blue light",
            "mood": "heartbreak",
            "era_connection": "Midnights",
        },
    ],
    "Bejeweled": [
        {
            "artist": "Robyn",
            "song": "Honey",
            "reason": "Both are reclamation anthems wrapped in disco light — remembering your worth after someone tried to dim you",
            "mood": "empowerment",
            "era_connection": "Midnights",
        },
        {
            "artist": "Sabrina Carpenter",
            "song": "Espresso",
            "reason": "Both are self-assured bops about knowing your own magnetism — confidence as the best accessory",
            "mood": "empowerment",
            "era_connection": "Midnights",
        },
    ],
    "Karma": [
        {
            "artist": "Charli XCX",
            "song": "360",
            "reason": "Both are victory laps set to pulsing beats — the sweet satisfaction of watching the universe correct itself",
            "mood": "empowerment",
            "era_connection": "Midnights",
        },
        {
            "artist": "Lorde",
            "song": "Stoned at the Nail Salon",
            "reason": "Both reflect on the long arc of justice — one with defiance, one with acceptance, both with relief",
            "mood": "introspective",
            "era_connection": "Midnights",
        },
    ],
    "Mastermind": [
        {
            "artist": "Arctic Monkeys",
            "song": "I Bet You Look Good on the Dancefloor",
            "reason": "Both confess to engineering a meeting that was supposed to look accidental — romance as calculated risk",
            "mood": "romantic",
            "era_connection": "Midnights",
        },
        {
            "artist": "Kate Bush",
            "song": "Babooshka",
            "reason": "Both explore the ways women architect their own love stories — strategy and vulnerability intertwined",
            "mood": "introspective",
            "era_connection": "Midnights",
        },
    ],
    "You're On Your Own Kid": [
        {
            "artist": "Phoebe Bridgers",
            "song": "Kyoto",
            "reason": "Both are coming-of-age stories compressed into four minutes — the lonely, exhilarating realization that you're all you've got",
            "mood": "introspective",
            "era_connection": "Midnights",
        },
        {
            "artist": "Lucy Dacus",
            "song": "Going Going Gone",
            "reason": "Both find empowerment in the terrifying freedom of having no one to fall back on",
            "mood": "empowerment",
            "era_connection": "Midnights",
        },
        {
            "artist": "Gracie Abrams",
            "song": "Close to You",
            "reason": "Both trace the arc from naive hope to hard-won independence with devastating emotional precision",
            "mood": "melancholy",
            "era_connection": "Midnights",
        },
    ],
    "Fortnight": [
        {
            "artist": "The National",
            "song": "I Need My Girl",
            "reason": "Both are love songs stripped to their most desolate — wanting someone with the dull ache of chronic pain",
            "mood": "melancholy",
            "era_connection": "The Tortured Poets Department",
        },
        {
            "artist": "James Blake",
            "song": "The Wilhelm Scream",
            "reason": "Both are songs about love as captivity — beautiful and suffocating in equal measure",
            "mood": "melancholy",
            "era_connection": "The Tortured Poets Department",
        },
    ],
    "I Can Do It With a Broken Heart": [
        {
            "artist": "Robyn",
            "song": "Dancing On My Own",
            "reason": "The definitive 'performing happiness while dying inside' songs — both make the dancefloor a stage for private grief",
            "mood": "heartbreak",
            "era_connection": "The Tortured Poets Department",
        },
        {
            "artist": "Carly Rae Jepsen",
            "song": "Party for One",
            "reason": "Both turn self-sufficiency into a survival mechanism wrapped in irresistible pop production",
            "mood": "empowerment",
            "era_connection": "The Tortured Poets Department",
        },
    ],
    "So Long London": [
        {
            "artist": "Adele",
            "song": "Hello",
            "reason": "Both are elegies for love left in a specific city — geography holds the ghost of what used to be",
            "mood": "heartbreak",
            "era_connection": "The Tortured Poets Department",
        },
        {
            "artist": "The Cranberries",
            "song": "Ode to My Family",
            "reason": "Both are farewells to places and people that shaped you — leaving as an act of survival",
            "mood": "melancholy",
            "era_connection": "The Tortured Poets Department",
        },
    ],
    "Down Bad": [
        {
            "artist": "SZA",
            "song": "Kill Bill",
            "reason": "Both are unhinged devotion anthems — love so extreme it becomes science fiction and nobody's fine",
            "mood": "heartbreak",
            "era_connection": "The Tortured Poets Department",
        },
        {
            "artist": "Mitski",
            "song": "I Want You",
            "reason": "Both capture desire so intense it becomes its own kind of alien abduction — wanting beyond reason",
            "mood": "heartbreak",
            "era_connection": "The Tortured Poets Department",
        },
    ],
    "The Smallest Man Who Ever Lived": [
        {
            "artist": "Fiona Apple",
            "song": "Waltz (Better Than Fine)",
            "reason": "Both methodically dismantle a man who thought he was bigger than he was — forensic character assassination",
            "mood": "rage",
            "era_connection": "The Tortured Poets Department",
        },
        {
            "artist": "Alanis Morissette",
            "song": "You Oughta Know",
            "reason": "Both are addressed directly to the person who wronged them — unflinching, specific, and surgically devastating",
            "mood": "rage",
            "era_connection": "The Tortured Poets Department",
        },
    ],
    "I Can Fix Him": [
        {
            "artist": "Lana Del Rey",
            "song": "Born to Die",
            "reason": "Both romanticize the fixer fantasy before the twist — the irresistible pull of someone you know is bad for you",
            "mood": "romantic",
            "era_connection": "The Tortured Poets Department",
        },
        {
            "artist": "Gracie Abrams",
            "song": "That's So True",
            "reason": "Both wear self-awareness like a badge — knowing you're repeating the pattern and narrating it in real time",
            "mood": "melancholy",
            "era_connection": "The Tortured Poets Department",
        },
    ],
    "thanK you aIMee": [
        {
            "artist": "Olivia Rodrigo",
            "song": "get him back!",
            "reason": "Both are revenge songs that transcend revenge — turning the knife into a thank-you note with a poisoned pen",
            "mood": "empowerment",
            "era_connection": "The Tortured Poets Department",
        },
        {
            "artist": "Paramore",
            "song": "Rose-Colored Boy",
            "reason": "Both address someone specific with a smile that's sharper than any scream — the most elegant kind of fury",
            "mood": "empowerment",
            "era_connection": "The Tortured Poets Department",
        },
    ],
    "Who's Afraid of Little Old Me?": [
        {
            "artist": "Florence + The Machine",
            "song": "King",
            "reason": "Both are declarations of power from women who were underestimated — crowning themselves in front of their doubters",
            "mood": "empowerment",
            "era_connection": "The Tortured Poets Department",
        },
        {
            "artist": "Kate Bush",
            "song": "Wuthering Heights",
            "reason": "Both channel something feral and literary — women reclaiming narratives with a theatrical intensity that commands attention",
            "mood": "empowerment",
            "era_connection": "The Tortured Poets Department",
        },
        {
            "artist": "Billie Eilish",
            "song": "LUNCH",
            "reason": "Both dare you to underestimate them — the quiet before the storm set to a beat that hits like thunder",
            "mood": "empowerment",
            "era_connection": "The Tortured Poets Department",
        },
    ],
}


ERA_ARTISTS = {
    "Taylor Swift": [
        {"name": "Kacey Musgraves", "reason": "Country storytelling with poetic precision and small-town heart"},
        {"name": "Shania Twain", "reason": "The blueprint for country crossover confidence"},
        {"name": "Dixie Chicks", "reason": "Bold country voices unafraid to speak their truth"},
        {"name": "Keith Urban", "reason": "Polished country-pop with genuine emotion"},
        {"name": "Carrie Underwood", "reason": "Powerhouse country vocals and dramatic storytelling"},
    ],
    "Fearless": [
        {"name": "Colbie Caillat", "reason": "Sun-drenched acoustic pop with diary-entry lyrics"},
        {"name": "Demi Lovato", "reason": "Young, powerful vocals channeling big emotions"},
        {"name": "Paramore", "reason": "Teenage anthems that turn vulnerability into volume"},
        {"name": "Kelly Clarkson", "reason": "Pop-rock catharsis and unapologetic emotional honesty"},
        {"name": "Michelle Branch", "reason": "Acoustic-driven pop with confessional, youthful energy"},
    ],
    "Speak Now": [
        {"name": "Florence + The Machine", "reason": "Theatrical, romantic grandeur and fearless vulnerability"},
        {"name": "Imogen Heap", "reason": "Ethereal, innovative production with deeply personal lyrics"},
        {"name": "Sara Bareilles", "reason": "Piano-driven pop with witty, emotionally precise songwriting"},
        {"name": "Ingrid Michaelson", "reason": "Intimate indie pop with theatrical sensibility"},
        {"name": "CHVRCHES", "reason": "Synth-laced confessions with arena-sized ambition"},
    ],
    "Red": [
        {"name": "The National", "reason": "Literary rock with emotional devastation and autumn-colored production"},
        {"name": "Bon Iver", "reason": "Raw, aching vocals and genre-defying emotional landscapes"},
        {"name": "Mumford & Sons", "reason": "Folk-rock catharsis that builds from whispers to roars"},
        {"name": "Ed Sheeran", "reason": "Acoustic storytelling with pop hooks and genuine vulnerability"},
        {"name": "Fleetwood Mac", "reason": "The original blueprint for turning heartbreak into a masterpiece"},
        {"name": "Hozier", "reason": "Soulful, earthy rock anchored in literary references and deep feeling"},
    ],
    "1989": [
        {"name": "Carly Rae Jepsen", "reason": "Pop maximalism with emotional sincerity — the art of the perfect hook"},
        {"name": "HAIM", "reason": "Polished pop-rock with California sunshine and sisterly harmonies"},
        {"name": "Bleachers", "reason": "Synth-pop that wears its heart on its sleeve with 80s production flair"},
        {"name": "Charli XCX", "reason": "Boundary-pushing pop with attitude and infectious energy"},
        {"name": "Lorde", "reason": "Minimalist pop that makes youth feel mythological"},
        {"name": "Robyn", "reason": "The queen of dance-floor heartbreak anthems"},
        {"name": "Tame Impala", "reason": "Psychedelic pop with shimmering, synth-driven landscapes"},
    ],
    "reputation": [
        {"name": "The Weeknd", "reason": "Dark, pulsing R&B that thrives in shadows and neon"},
        {"name": "Billie Eilish", "reason": "Whispered menace and bass-heavy darkness with pop instincts"},
        {"name": "Arctic Monkeys", "reason": "Sharp-tongued reinvention and leather-jacket swagger"},
        {"name": "Halsey", "reason": "Dark pop that turns chaos into compelling narrative"},
        {"name": "Lana Del Rey", "reason": "Cinematic darkness and doomed romantic aesthetics"},
        {"name": "Twenty One Pilots", "reason": "Genre-blending darkness with hidden vulnerability"},
    ],
    "Lover": [
        {"name": "Harry Styles", "reason": "Warm, inclusive pop-rock dripping with sincerity and style"},
        {"name": "Kacey Musgraves", "reason": "Golden-hour love songs with crystalline clarity"},
        {"name": "Lizzo", "reason": "Unabashed self-love anthems wrapped in pure joy"},
        {"name": "HAIM", "reason": "Sisterly warmth and summery pop-rock perfection"},
        {"name": "Carly Rae Jepsen", "reason": "Effervescent pop romance and celebration"},
        {"name": "Sabrina Carpenter", "reason": "Witty, sparkly pop with a mischievous wink"},
    ],
    "folklore": [
        {"name": "Bon Iver", "reason": "Indie folk introspection and ethereal production"},
        {"name": "Phoebe Bridgers", "reason": "Quiet devastation and literary indie folk storytelling"},
        {"name": "The National", "reason": "Melancholic indie rock with poetic, conversational lyrics"},
        {"name": "Big Thief", "reason": "Raw, intimate folk that feels like eavesdropping on a confession"},
        {"name": "Sufjan Stevens", "reason": "Delicate, devastating folk that turns the personal into the mythological"},
        {"name": "Julien Baker", "reason": "Stripped-back emotional intensity and unflinching honesty"},
        {"name": "Lucy Dacus", "reason": "Storytelling with photographic emotional detail"},
        {"name": "Japanese Breakfast", "reason": "Indie art-pop that processes grief through beauty"},
    ],
    "evermore": [
        {"name": "Bon Iver", "reason": "Continued collaboration and shared emotional landscape"},
        {"name": "HAIM", "reason": "Autumnal folk-rock with harmonies and heart"},
        {"name": "Fleetwood Mac", "reason": "Timeless folk-rock storytelling and ensemble magic"},
        {"name": "Joni Mitchell", "reason": "The North Star of confessional folk songwriting"},
        {"name": "Big Thief", "reason": "Earthy, literary folk-rock with devastating emotional payoffs"},
        {"name": "Iron & Wine", "reason": "Whispery folk with nature imagery and quiet profundity"},
        {"name": "Fleet Foxes", "reason": "Lush, harmonious folk that sounds like golden hour in a forest"},
    ],
    "Midnights": [
        {"name": "Lorde", "reason": "Nocturnal pop introspection and 3AM confessions"},
        {"name": "SZA", "reason": "Late-night R&B vulnerability and fearless self-examination"},
        {"name": "Frank Ocean", "reason": "Midnight-hued soundscapes and emotional depth"},
        {"name": "Tame Impala", "reason": "Synth-driven nocturnal reveries and introspective grooves"},
        {"name": "Beach House", "reason": "Dream-pop that exists between sleep and waking"},
        {"name": "Cigarettes After Sex", "reason": "Ambient, late-night romanticism and whispered desire"},
        {"name": "The 1975", "reason": "Self-aware pop with late-night confessional energy"},
    ],
    "The Tortured Poets Department": [
        {"name": "Phoebe Bridgers", "reason": "Literary precision and devastating emotional clarity"},
        {"name": "Fiona Apple", "reason": "Uncompromising lyrical genius and raw emotional intensity"},
        {"name": "Mitski", "reason": "Poetic intensity and the art of making pain beautiful"},
        {"name": "Gracie Abrams", "reason": "Confessional songwriting with Gen-Z vulnerability"},
        {"name": "boygenius", "reason": "Collaborative poetry and shared emotional landscapes"},
        {"name": "The National", "reason": "Baritone melancholy and literary heartbreak"},
        {"name": "James Blake", "reason": "Electronic minimalism processing maximum emotion"},
        {"name": "Florence + The Machine", "reason": "Theatrical grandeur applied to intimate pain"},
    ],
    "The Life Of A Showgirl": [
        {"name": "Sabrina Carpenter", "reason": "Featured collaborator, shared pop sensibility"},
        {"name": "Lorde", "reason": "Fame introspection and pop deconstruction"},
        {"name": "Charli XCX", "reason": "Pop maximalism and self-aware stardom"},
        {"name": "Olivia Rodrigo", "reason": "Confessional pop from the new generation"},
        {"name": "Billie Eilish", "reason": "Subversive pop and celebrity consciousness"},
    ],
}


MOOD_MAPPING = {
    "heartbreak": [
        "All Too Well",
        "Back to December",
        "Teardrops On My Guitar",
        "exile",
        "my tears ricochet",
        "champagne problems",
        "tolerate it",
        "Maroon",
        "I Knew You Were Trouble",
        "Last Kiss",
        "Dear John",
        "White Horse",
        "Getaway Car",
        "So Long London",
        "Down Bad",
        "I Can Do It With a Broken Heart",
        "happiness",
        "illicit affairs",
        "august",
        "Red",
    ],
    "euphoria": [
        "Shake It Off",
        "22",
        "Cruel Summer",
        "Sparks Fly",
        "ME!",
        "Love Story",
        "You Belong With Me",
        "State of Grace",
        "Holy Ground",
        "Welcome to New York",
        "...Ready For It?",
        "Bejeweled",
        "Paper Rings",
        "I Think He Knows",
        "New Romantics",
        "Blank Space",
        "Style",
        "Elizabeth Taylor",
        "The Life of a Showgirl",
    ],
    "melancholy": [
        "this is me trying",
        "the 1",
        "Fifteen",
        "Clean",
        "happiness",
        "gold rush",
        "Midnight Rain",
        "Wildest Dreams",
        "Sad Beautiful Tragic",
        "The Last Great American Dynasty",
        "Right Where You Left Me",
        "Forever Winter",
        "cardigan",
        "Fortnight",
        "I Can Fix Him",
        "Snow on the Beach",
        "tolerate it",
    ],
    "rage": [
        "Look What You Made Me Do",
        "Bad Blood",
        "I Knew You Were Trouble",
        "Picture to Burn",
        "my tears ricochet",
        "no body no crime",
        "Mad Woman",
        "The Smallest Man Who Ever Lived",
        "Who's Afraid of Little Old Me?",
        "I Did Something Bad",
        "Better Than Revenge",
        "Mean",
        "Should've Said No",
    ],
    "nostalgia": [
        "Tim McGraw",
        "Fifteen",
        "Begin Again",
        "the 1",
        "seven",
        "cardigan",
        "Wildest Dreams",
        "Out of the Woods",
        "'tis the damn season",
        "All Too Well",
        "Treacherous",
        "invisible string",
        "You're On Your Own Kid",
        "Long Live",
        "Never Grow Up",
        "Ronan",
    ],
    "romantic": [
        "Love Story",
        "You Belong With Me",
        "Enchanted",
        "Lover",
        "invisible string",
        "Delicate",
        "Style",
        "Everything Has Changed",
        "Mine",
        "Treacherous",
        "betty",
        "willow",
        "ivy",
        "Call It What You Want",
        "Lavender Haze",
        "Snow on the Beach",
        "Mastermind",
        "gold rush",
        "New Year's Day",
        "peace",
        "Honey",
        "Actually Romantic",
    ],
    "empowerment": [
        "Shake It Off",
        "Blank Space",
        "Look What You Made Me Do",
        "Mean",
        "Bejeweled",
        "Karma",
        "The Man",
        "You Need To Calm Down",
        "We Are Never Getting Back Together",
        "Clean",
        "long story short",
        "thanK you aIMee",
        "Who's Afraid of Little Old Me?",
        "I Can Do It With a Broken Heart",
        "I Did Something Bad",
        "New Romantics",
        "Welcome to New York",
        "Cancelled!",
        "The Fate of Ophelia",
    ],
    "introspective": [
        "The Archer",
        "this is me trying",
        "Anti-Hero",
        "You're On Your Own Kid",
        "peace",
        "mirrorball",
        "epiphany",
        "hoax",
        "Daylight",
        "Midnight Rain",
        "Mastermind",
        "The Lakes",
        "Karma",
        "Bigger Than The Whole Sky",
        "Would've Could've Should've",
        "Fortnight",
        "happiness",
        "Eldest Daughter",
        "Father Figure",
    ],
}


def get_editorial_recommendations(song_name: str, limit: int = 5) -> List[Dict]:
    """
    Look up editorial bridges for a given song name.
    Uses case-insensitive substring matching for fuzzy lookup.
    """
    song_name_lower = song_name.lower().strip()

    # Exact match first (case-insensitive)
    for key, bridges in EDITORIAL_BRIDGES.items():
        if key.lower() == song_name_lower:
            return bridges[:limit]

    # Substring match
    matches = []
    for key, bridges in EDITORIAL_BRIDGES.items():
        if song_name_lower in key.lower() or key.lower() in song_name_lower:
            matches.extend(bridges)

    if matches:
        return matches[:limit]

    # Word overlap match as last resort
    song_words = set(song_name_lower.split())
    best_key = None
    best_overlap = 0
    for key in EDITORIAL_BRIDGES:
        key_words = set(key.lower().split())
        overlap = len(song_words & key_words)
        if overlap > best_overlap:
            best_overlap = overlap
            best_key = key

    if best_key and best_overlap > 0:
        return EDITORIAL_BRIDGES[best_key][:limit]

    return []


def get_era_artists(era: str) -> List[Dict]:
    """Return the artist list for a given era."""
    era_lower = era.lower().strip()
    for key, artists in ERA_ARTISTS.items():
        if key.lower() == era_lower:
            return artists

    # Substring match
    for key, artists in ERA_ARTISTS.items():
        if era_lower in key.lower() or key.lower() in era_lower:
            return artists

    return []


def get_mood_songs(mood: str) -> List[str]:
    """Return Taylor songs matching a given mood."""
    mood_lower = mood.lower().strip()
    for key, songs in MOOD_MAPPING.items():
        if key.lower() == mood_lower:
            return songs

    # Substring match
    for key, songs in MOOD_MAPPING.items():
        if mood_lower in key.lower() or key.lower() in mood_lower:
            return songs

    return []
