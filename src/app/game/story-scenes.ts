import { MEMORIAL } from './content';
import { OLD_RAIL, Staging, StoryBeat, StoryScene } from './story';

/**
 * The words of the story: every scene, beat by beat. Kept apart from story.ts so the app can
 * load them after the game has started. `{name}` is the companion walking with you.
 */
const G = 'Grandpa';
const YOU = 'You';

// Places the scenes return to.
const PORCH: Omit<Staging, 'minute'> = {
  areaId: 'homestead',
  player: { x: -5.5, z: -0.9 },
  companion: { x: -4.8, z: -0.3 },
  grandpa: { x: -6.4, z: -1.6 },
  pip: { x: -7.2, z: -0.8 },
};
const HEARTH: Omit<Staging, 'minute'> = {
  areaId: 'cottage',
  player: { x: 0.9, z: -1.5 },
  companion: { x: 0.6, z: -0.5 },
  grandpa: { x: 2, z: -2.3 },
  pip: { x: 3, z: -2 },
};
const GATE: Omit<Staging, 'minute'> = {
  areaId: 'homestead',
  player: { x: -11.6, z: 1.3 },
  companion: { x: -10.8, z: 2.2 },
  grandpa: { x: -10.5, z: 0.4 },
  pip: { x: -10.1, z: 1.7 },
};
const UNDER_THE_TREE: Omit<Staging, 'minute'> = {
  areaId: 'glade',
  player: { x: MEMORIAL.x - 1.5, z: MEMORIAL.z + 1.2 },
  companion: { x: MEMORIAL.x - 2.1, z: MEMORIAL.z + 1.9 },
  pip: { x: MEMORIAL.x - 0.6, z: MEMORIAL.z + 0.7 },
};
const RAIL: Omit<Staging, 'minute'> = {
  areaId: 'colosseum',
  player: { x: -5.7, z: 0.5 },
  companion: { x: -5, z: 1.1 },
  pip: { x: OLD_RAIL.x - 0.4, z: OLD_RAIL.z + 0.8 },
};

const letter = (heading: string, line: string): StoryBeat => ({ card: 'letter', heading, line });
const chapter = (heading: string, line: string): StoryBeat => ({ card: 'title', heading, line });

/** Every scene, by id. `{name}` is the companion walking with you when it plays. */
export const SCENES: readonly StoryScene[] = [
  // ───────────────────────────── Year one ─────────────────────────────
  {
    id: 'porch-stars',
    title: 'The porch, after supper',
    beats: [
      {
        stage: { ...PORCH, minute: 1230, season: 'spring' },
        line: 'After supper Grandpa takes his tea out to the porch bench, as he does every evening it isn’t raining. Tonight he pats the boards beside him.',
      },
      {
        speaker: G,
        line: 'Look at {name}. A few days here and already asleep on your foot. You know what that means?',
      },
      {
        speaker: G,
        line: 'Nothing. A critter will sleep on anybody’s foot. Ask me again in a year or two, when {name} could be anywhere on this whole stead and still picks yours.',
      },
      {
        line: 'Pip is lying a few steps off with his chin on his paws, facing the two of you. You realise you have never once seen him lie any other way.',
      },
      {
        speaker: G,
        line: 'When I was your age I thought the best critter was the fastest one. Took me forty years to find out it’s the one waiting at the gate.',
      },
      {
        speaker: G,
        line: 'Bed, sleepyhead. The berries won’t mind if you’re late. Pip will.',
      },
    ],
  },
  {
    id: 'first-ribbon',
    title: 'The mantel',
    beats: [
      {
        stage: { ...HEARTH, minute: 1200 },
        line: 'You come home with a ribbon in your pocket and try to mention it as though it were nothing. Grandpa is not fooled for one second.',
      },
      { speaker: G, line: 'Well, don’t keep it in your pocket. Ribbons crease.' },
      {
        line: 'He takes it to the mantel and hangs it on a nail, then stands back with his head on one side, as if it were a painting.',
      },
      {
        line: 'There is a second nail beside it, a little higher, with nothing on it. It has been there your whole life. You have never wondered about it before.',
      },
      {
        speaker: G,
        line: '{name} did that. You held the ribbon; {name} did the running. I’ve watched good ranchers go sour forgetting which was which.',
      },
    ],
  },
  {
    id: 'long-time-ago',
    title: 'Something Bertram said',
    beats: [
      {
        stage: { ...PORCH, minute: 1050, season: 'summer' },
        line: 'It is Bertram at the tavern who lets it slip, the way Bertram lets most things slip. Grand Champion. Your grandfather. You carry it home like a hot dish.',
      },
      { speaker: YOU, line: 'Is it true? You were Grand Champion?' },
      { line: 'Grandpa goes on shelling peas for a while.' },
      {
        speaker: G,
        line: 'Bertram wants his mouth sewn up. …It was a long time ago. And Pip did most of it.',
      },
      { line: 'Pip’s ear turns at his name. That is all.' },
      { speaker: YOU, line: 'Why did you stop?' },
      { speaker: G, line: 'Something better came along.' },
      {
        line: 'He looks at you a moment longer than the answer needs. Then he remembers the kettle and goes in to see about it, and that is all you get.',
      },
    ],
  },
  {
    id: 'school-cart-1',
    title: 'The school cart',
    beats: [
      {
        stage: { ...GATE, minute: 420, season: 'autumn' },
        line: 'On the first morning of autumn the school cart is at the gate before the mist is off the field. It comes every year. Every year you manage to be surprised.',
      },
      {
        speaker: G,
        line: 'Two terms. Autumn and winter, and you’re back before the turnips are. Don’t pull that face. I went, and look how I turned out.',
      },
      {
        line: '{name} does not understand the trunk, or the cart, or why you keep kneeling down again.',
      },
      {
        speaker: G,
        line: '{name} will be here in spring. So will Pip. So will I. That’s a promise, and I have never broken one to you yet.',
      },
      {
        line: 'From the back of the cart you watch the three of them get smaller: an old man, an old Brindlekin, and {name}, who sits down in the road and stays sat until the bend takes them.',
      },
      letter(
        'A letter from home · autumn',
        'Sleepyhead,\n\n{name} waited at the gate for two days. On the third, Pip went down and sat with {name} a while. I don’t know what was said, but they came back up together, and {name} has eaten properly since.\n\nPip has taken over the lessons. He is stricter than I am. The berries were poor this year and the turnips were insulting.\n\nI am well. Learn something.\n\n— G.',
      ),
      letter(
        'A letter from home · Midwinter',
        'Sleepyhead,\n\nSnow to the top of the gatepost. {name} had never seen it and tried to bite all of it. I have kept the stove going in the barn, so you need not write to me about that.\n\nThey hold the big championship today, the last day of winter, same as always. You can hear the crowd from the porch when the wind is right. I didn’t go. Pip and I sat out a while and listened.\n\n— G.',
      ),
      letter(
        'A letter from home · the thaw',
        'Sleepyhead,\n\nThis will reach you about a week before you reach us. {name} is bigger than you left. You will pretend not to be surprised, and you will fail.\n\nI have oiled the gate so it won’t give you away coming in. It won’t matter. Pip will know. He has been sitting at the bend since Tuesday.\n\n— G.',
      ),
      chapter('Year Two', 'Spring'),
      {
        stage: { ...GATE, minute: 480, season: 'spring' },
        line: 'The gate doesn’t make a sound. It doesn’t matter. {name} hits you at knee height before you have the latch down.',
      },
      {
        line: 'Grandpa comes down the path behind, not hurrying. He looks the same. Perhaps a little smaller. That will be because you have grown.',
      },
      { speaker: G, line: 'Stand against the post. Go on. Heels back.' },
      {
        line: 'He lays his pocketknife flat on the top of your head and cuts a notch in the gatepost. There is a ladder of them there, one for every spring, going down and down to one no higher than Pip.',
      },
      {
        speaker: G,
        line: 'Hm. You’re gaining on me. Shoes off at the door. Welcome home, sleepyhead.',
      },
    ],
  },
  // ───────────────────────────── Year two ─────────────────────────────
  {
    id: 'judge-the-turnips',
    title: 'The view from the porch',
    beats: [
      {
        stage: { ...PORCH, minute: 870, season: 'spring' },
        line: 'This spring Grandpa doesn’t walk out to the field fence in the afternoons. He says the porch has a better view. It doesn’t.',
      },
      {
        speaker: G,
        line: 'Go and judge the turnips for me. Lean on the fence a good while first, or they’ll know you for an amateur.',
      },
      { speaker: YOU, line: '…They’re fine.' },
      {
        speaker: G,
        line: '“Fine.” Forty years I leaned on that fence, and the child says “fine.” Tops green, or yellowing? Soil cracked? Did {name} look at them hungry, or bored?',
      },
      {
        line: 'You go back out. You lean on the fence a good while. When you come back you have a great deal more to say, and he listens to every word of it with his eyes closed, nodding.',
      },
      {
        speaker: G,
        line: 'There. Now you’ve seen a turnip. Tomorrow you can tell me what the weather means to do, and I’ll tell you if you’re right.',
      },
    ],
  },
  {
    id: 'old-rail',
    title: 'The long way to the Colosseum',
    beats: [
      {
        stage: { ...RAIL, minute: 780, season: 'summer', grandpa: OLD_RAIL },
        line: 'It takes most of the morning to walk to the Colosseum, because Grandpa has decided to come, and rests twice on the road, and will not hear of the cart.',
      },
      {
        line: 'People keep stopping. Nobody makes a fuss. A man takes his hat off. Celia Vane comes out from behind the promotion desk, which you have never once seen her do, and simply stands a moment with her hands folded.',
      },
      {
        line: 'He goes to the west end of the stands, where the stone gives out, and leans on the rail. There is a pale patch on the boards at his feet, worn smooth, about the size of a Brindlekin. Pip lies down on it without being asked.',
      },
      {
        speaker: G,
        line: 'We stood right down there. He was quick, then. You wouldn’t credit it.',
      },
      { speaker: YOU, line: 'Did you win?' },
      { speaker: G, line: 'Pip won. I held the ribbon.' },
      {
        speaker: G,
        line: 'They settle the big one at Midwinter. Last day of winter, when the farms are asleep and the whole valley can come. It’s for folk who hold their own stead, not for schoolchildren. You’ll be at your desk. …One winter you won’t be.',
      },
      {
        line: 'He watches the sand a while longer. Then he says his knees have had enough history for one day, and the three of you take the long road home.',
      },
    ],
  },
  {
    id: 'champion-ribbon',
    title: 'A blue ribbon',
    beats: [
      {
        stage: { ...HEARTH, minute: 1200 },
        line: 'The Champion’s ribbon is a blue so deep it looks black until the firelight finds it. You hold it out. For once, Grandpa has nothing ready to say.',
      },
      {
        line: 'He turns it over twice. He runs his thumb down the edge, the way you would check a blade.',
      },
      { speaker: G, line: 'They haven’t changed the stitching.' },
      {
        speaker: G,
        line: 'There’s only the one step above this. I’ll not tell you how to take it. I only ever knew how Pip and I did, and you’re not me, and {name} is certainly not Pip.',
      },
      {
        speaker: G,
        line: 'Midwinter, then. Some Midwinter. No hurry. {name} isn’t going anywhere, and neither is the title. It has waited this long.',
      },
      {
        line: 'He hangs the blue ribbon on the lower nail, with the others. The higher nail stays empty. You notice him not looking at it.',
      },
    ],
  },
  {
    id: 'school-cart-2',
    title: 'The school cart',
    beats: [
      {
        stage: { ...GATE, minute: 420, season: 'autumn' },
        line: 'The cart again. You are too old for the face now, so you don’t pull it. Grandpa has come down to the gate with a stick, which is new this year, and which neither of you mentions.',
      },
      {
        speaker: G,
        line: 'Same as before. Two terms. Mind your sums. A rancher who can’t count gets cheated on feed.',
      },
      { speaker: YOU, line: 'And you’ll be here in spring.' },
      { speaker: G, line: 'Pip will be at the gate.' },
      {
        line: 'It is only at the bend, looking back at the three of them, that you hear what he didn’t say.',
      },
      letter(
        'A letter from home · autumn',
        'Sleepyhead,\n\nYou’ll be glad to know {name} has taken over the morning berry round, and Pip has let it happen, which from Pip is a medal.\n\nI have moved my chair nearer the window. The view is no better, but I can see the gate. Marigold sends up soup I didn’t ask for. I am eating it so as not to offend.\n\n— G.',
      ),
      letter(
        'A letter from home · Midwinter',
        'Sleepyhead,\n\nChampionship day. Snow again. I didn’t sit out this year. Pip went to the porch on his own and listened for both of us, and came in and told me all about it, in his way.\n\nHetty Larkspur held on to the title. That is fourteen winters now. She is better than I was. Don’t tell her I said so.\n\n— G.',
      ),
      letter(
        'A letter from home · in another hand',
        'To the young one at Bramblewick,\n\nThis is Marigold Hale writing, as your grandfather’s hands are bad with the cold, and he says a letter in his writing just now would only worry you.\n\nHe says to say: the turnips are fine, the roof is fine, he is fine. I am to tell you that he dictated that, and that I am not to add anything.\n\nSo I will only add that Dr. Fenn has been up twice, and that I should not dawdle on the road home if I were you.\n\nHe would like it known that {name} is fat and happy. That part is true.\n\n— M. Hale, for G.',
      ),
      chapter('Year Three', 'Spring'),
      {
        stage: { ...GATE, minute: 480, season: 'spring', grandpa: undefined },
        line: 'Pip is at the gate. Only Pip, sitting very straight at the bend, exactly where a letter once said he would be. {name} is one step behind him, shaking with the effort of waiting to be told.',
      },
      {
        stage: { ...HEARTH, minute: 500, season: 'spring' },
        line: 'Grandpa is in his chair by the window with a blanket over his knees. He has the pocketknife ready on the arm of it.',
      },
      {
        speaker: G,
        line: 'Don’t stand there looking at me as if I were a bill. Go and stand against the post. I’m not walking down there. You’ll have to cut it yourself, and tell me true.',
      },
      {
        line: 'You cut the notch yourself. It is higher than the last by a hand. When you come back in and tell him, he makes you say it twice, and then he is quiet for a bit.',
      },
      {
        speaker: G,
        line: 'Taller than me, then. Good. That’s the right way round. …Welcome home, sleepyhead.',
      },
    ],
  },
  // ───────────────────────────── Year three ─────────────────────────────
  {
    id: 'chess-book',
    title: 'The chess book',
    beats: [
      {
        stage: { ...HEARTH, minute: 1215, season: 'spring' },
        line: 'Grandpa keeps to the house this spring. He has moved the chess book from the shelf to the arm of his chair, and some evenings he reads a problem out of it and makes {name} solve it, and takes {name}’s side when you disagree.',
      },
      {
        speaker: G,
        line: 'Everything I know that’s worth knowing, I have already shown you. You didn’t notice, because it looked like chores.',
      },
      {
        speaker: G,
        line: 'The rest is in this book, and most of it’s wrong. I have written in the margins where.',
      },
      { speaker: YOU, line: 'You could just tell me.' },
      {
        speaker: G,
        line: 'I could. But then you’d only have what I said. I would rather you had the book, and an argument with it.',
      },
      {
        line: 'Pip, by the hearth, opens one eye at the pair of you and closes it again. He has heard this conversation before, you think. With somebody else, long ago, from the other side of it.',
      },
    ],
  },
  {
    id: 'last-good-day',
    title: 'The end of summer',
    beats: [
      {
        stage: {
          ...UNDER_THE_TREE,
          minute: 1155,
          season: 'summer',
          grandpa: { x: MEMORIAL.x - 0.2, z: MEMORIAL.z + 0.3 },
        },
        line: 'Near the end of summer there comes an evening so fine that Grandpa says he will walk to the glade, and does, on your arm, with Pip going ahead to make sure of the path.',
      },
      {
        line: 'You carry the porch bench out for him and set it where the path gives out, under the tree, where you can see every sunberry bush at once. The light comes in low and gold and sideways.',
      },
      {
        speaker: G,
        line: 'This is where you arrived, you know. Not the cottage. Here. I was picking, and somebody came up the lane carrying you, and I had my hands full of berries and nowhere to put them.',
      },
      {
        speaker: G,
        line: 'You were that small, Pip took you for a new sort of critter. He went and fetched you a berry. Put it down by your blanket and sat back to see what you’d do.',
      },
      { speaker: YOU, line: 'What did I do?' },
      { speaker: G, line: 'Cried. He has never held it against you.' },
      {
        line: '{name} has fallen asleep across your feet. All of {name}, these days, which is a good deal more than it used to be. Grandpa looks at that for a while.',
      },
      {
        speaker: G,
        line: 'I told you to ask me again in a year or two. Well. There’s your answer.',
      },
      { speaker: G, line: 'When I’m not here to nag you—' },
      { speaker: YOU, line: 'Grandpa.' },
      {
        speaker: G,
        line: '—when I’m not here, feed them before you ask anything of them. And let Pip keep his rounds. He’ll need them more than you’ll need him to stop.',
      },
      {
        line: 'The light goes off the bushes one at a time. Nobody says it is time to go in. For a long while, nobody goes.',
      },
    ],
  },
  {
    id: 'the-passing',
    title: 'The first morning of autumn',
    beats: [
      {
        stage: {
          ...HEARTH,
          minute: 395,
          season: 'autumn',
          player: { x: -0.6, z: -1.4 },
          pip: { x: 2.3, z: -1.7 },
        },
        line: 'The first morning of autumn. You wake by yourself. It takes you a moment to know what is wrong with that.',
      },
      {
        line: 'Pip hasn’t come to wake you. Every morning of your life at Bramblewick, Pip has come and stood at the end of the bed and breathed at you until you gave in.',
      },
      {
        line: 'Grandpa is in his chair by the window, with the blanket over his knees and the chess book open on it, face down, to keep his place. Pip is lying across his feet. Pip looks up at you, and doesn’t move, and that is how you know.',
      },
      { line: 'The kettle is still a little warm.' },
      {
        stage: { ...GATE, minute: 425, season: 'autumn', grandpa: undefined, pip: undefined },
        line: 'The school cart comes at seven, the same as every year. The driver looks at your face and doesn’t ask. He takes off his cap, and turns the cart round in the lane, and goes to fetch Dr. Fenn himself. He doesn’t come back for you. Nobody suggests he should.',
      },
      {
        stage: { ...UNDER_THE_TREE, minute: 960, season: 'autumn' },
        line: 'They bury him on the third day, in Clover Glade, where the path gives out under the tree. The bench was already there.',
      },
      {
        line: 'All of Oakhaven walks up the lane. Marigold has shut the store on a market day. Bertram carries a chair for anyone who needs one, and then stands the whole time himself. Dr. Fenn. Wren Ashby, with a shelter pup asleep inside her coat. Gus and Celia and Ottilie from the Colosseum, in their booth colours, in a row.',
      },
      {
        line: 'Nobody makes a speech. He would have hated one. One by one they put a hand flat on the stone, the way you would pat a critter’s flank, and go back down the lane.',
      },
      {
        line: 'On the wall at the edge of the glade there is a ringed tail, very still, for as long as it takes. Then that is gone too.',
      },
      {
        stage: {
          areaId: 'homestead',
          minute: 470,
          season: 'autumn',
          player: { x: -5.6, z: -0.2 },
          companion: { x: -4.7, z: 0.4 },
          pip: { x: -7.4, z: -0.4 },
        },
        line: 'The morning after, you wake by yourself again. {name} wants breakfast. The trough wants filling. Pip is already out by the flowerpots, at the hour for watering them, looking at the can.',
      },
      { line: 'You pick up the can.' },
      chapter(
        'Autumn',
        'Grandpa only ever had the springs and summers to teach you in. The other two seasons you will have to learn for yourself.\n\nPip knows them both by heart.',
      ),
    ],
  },
  // ───────────────────────────── Keeping Pip’s rounds ─────────────────────────────
  {
    id: 'keepsake-pots',
    title: 'The flowerpots',
    beats: [
      {
        stage: {
          areaId: 'homestead',
          minute: 480,
          player: { x: -6.4, z: -0.5 },
          companion: { x: -5.4, z: 0.1 },
          pip: { x: -7.4, z: -0.4 },
        },
        line: 'You fill the can and water the pots by the door the way he did: slowly, one at a time, as if each of them might have something to say.',
      },
      {
        line: 'The last pot in the row has nothing in it. It is turned upside down to keep the rain out. When you tip the one beside it to drain, you see a name scratched into the clay underneath, where nobody would ever look.',
      },
      {
        line: 'You look under all of them. Bracken. Thimble. Old Dot. Hazel-and-a-half. One so worn you can only read it with your thumb. Every Brindlekin he ever raised, each a little more like Pip than the last. He planted a pot for each of them the day he lost them, and watered it every morning after.',
      },
      {
        line: 'There is no name under the empty one. Pip watches you set it back exactly as it was.',
      },
    ],
  },
  {
    id: 'keepsake-fence',
    title: 'The field fence',
    beats: [
      {
        stage: {
          areaId: 'homestead',
          minute: 900,
          player: { x: -12.6, z: -5.2 },
          companion: { x: -12.1, z: -4.2 },
          pip: { x: -13.4, z: -4.4 },
        },
        line: 'Pip is at the field fence at the hour for judging turnips. Nobody has judged them in a week. You lean on the top rail, since somebody ought to.',
      },
      {
        line: 'The rail is worn into two shallow dips a forearm apart, polished dark. Forty years of afternoons.',
      },
      {
        line: 'Your elbows don’t go there. They go, without your thinking about it, into a second pair just to the left: shallower, newer, and worn in a long slant, as though whoever made them had started out very short. You never knew you had a place here. You have been wearing it into the wood since before you can remember.',
      },
      {
        line: 'The turnips, for the record: tops green. Soil not cracked. {name} looks at them, bored. You say all of it out loud, in order. Pip listens with his eyes closed.',
      },
    ],
  },
  {
    id: 'keepsake-tin',
    title: 'Under the porch bench',
    beats: [
      {
        stage: {
          ...PORCH,
          minute: 1080,
          grandpa: undefined,
          player: { x: -6.2, z: -1.2 },
        },
        line: 'At the hour for tea, Pip goes to the porch bench and looks underneath it. Then at you. Then underneath it again, in case you are slow.',
      },
      {
        line: 'There is a biscuit tin pushed right to the back, soft with rust at the corners. Inside are ribbons, rolled tight as bandages. Fledgling green. Veteran gold. Champion blue. And one you have never seen: white with a gold edge, gone the colour of cream.',
      },
      {
        line: 'Under the ribbons, a piece of newspaper, folded small. GRAND CHAMPION WALKS AWAY. “Undefeated at eleven Midwinters, the Bramblewick rancher yesterday declined to defend his title and is not expected to return. Asked for a reason, he would say only that something better had come along, and that it wanted feeding every four hours.”',
      },
      { line: 'The paper is dated the winter you came to Bramblewick.' },
      {
        line: 'So that is the empty nail. Nothing was lost from it. He took it down himself, and put it away under the bench where he drank his tea every evening and watched you grow.',
      },
    ],
  },
  {
    id: 'keepsake-berry',
    title: 'Where the path gives out',
    beats: [
      {
        stage: { ...UNDER_THE_TREE, minute: 680 },
        line: 'After his morning round Pip doesn’t take the path home. He goes up to where it gives out under the tree, with one berry held very gently in his mouth, and lays it on the stone.',
      },
      {
        line: 'It is the best one. You can tell from here. He has been leaving the best one every morning; there is a little row of stalks where the birds have had the others.',
      },
      {
        line: 'He sits back to see what will happen. He has done this once before, you remember being told, for somebody who only cried.',
      },
      {
        line: '{name} watches all of it. Then {name} trots down to the nearest bush, and is gone a while, choosing, and comes back and sets a second berry beside the first. Nobody asked. Nobody taught {name} that.',
      },
      {
        line: '“That’s what a partner learns,” he said once, on a road, a long time ago. “Given time, and someone to watch.”',
      },
    ],
  },
  {
    id: 'keepsake-letter',
    title: 'His chair',
    beats: [
      {
        stage: {
          ...HEARTH,
          minute: 1230,
          grandpa: undefined,
          pip: { x: 2, z: -2.3 },
          player: { x: 1.1, z: -1.5 },
        },
        line: 'On the first cold night of winter, Pip does something he has never done. He gets up into Grandpa’s chair. He turns round once, lies down on the chess book, and looks at you until you come and take it out from under him.',
      },
      {
        line: 'The book falls open where it has always been kept open. There is a letter there, in the hand that wrote in all the margins. On the outside: SLEEPYHEAD. NOT BEFORE WINTER.',
      },
      letter(
        'Not before winter',
        'Sleepyhead,\n\nIf Pip has let you have this, then it is winter, and you have got through an autumn by yourself, which I never taught you. Good. I knew you would.\n\nI want to tell you where the money went. You will have looked by now, and found forty-one coins in the tea caddy and the deeds to nothing much, and wondered what sort of champion dies with forty-one coins.',
      ),
      letter(
        'Not before winter',
        'The winter you came, Pip was already old. Older than any Brindlekin has a right to be. I took him to the growth labs in the city and asked what it would cost to keep him, and they told me, and it was everything: the winnings, the low fields, the cups off the mantel.\n\nI asked first what it would cost for me. They were kind about it. There are things they can do for a critter that they cannot do for an old man.',
      ),
      letter(
        'Not before winter',
        'So I bought the years for Pip instead.\n\nNot so he could win anything. He had done his winning. I bought them because I counted up, and however I counted, I was going to run out before you were grown. And I could not stand the thought of you coming down some morning to a cold kitchen, and nobody in the whole house who remembered how things are done.\n\nNow there will always be somebody. He knows every bush by name. He knows you.',
      ),
      letter(
        'Not before winter',
        'People will tell you I gave up the title for you. Don’t let them. I never gave up a thing. I was handed a small loud person who thought turnips were “fine”, and I would not swap one afternoon of it for every Midwinter there ever was.\n\nBeing useful and being loved are different things. You were loved a long while before you were any use at all.\n\nLook after Pip. Let him look after you. He will want to.\n\n— G.',
      ),
      letter(
        'Not before winter',
        'P.S. The title is still up there, if you and {name} ever want it. I left it warm. But want it for yourselves, or leave it be.\n\nP.P.S. It is morning somewhere.\n\nShoes on, sleepyhead.',
      ),
      { line: 'Pip has moved over in the chair. There is exactly enough room.' },
    ],
  },
  // ───────────────────────────── Midwinter ─────────────────────────────
  {
    id: 'midwinter-morning',
    title: 'Midwinter',
    beats: [
      {
        stage: { ...GATE, minute: 470, season: 'winter', grandpa: undefined },
        line: 'Midwinter. The last day of winter, when the farms are asleep and the whole valley can come. You have {name} brushed and fed, and the entry fee counted out twice.',
      },
      {
        line: 'Pip is waiting at the gate. He hasn’t left the stead since the autumn. He looks at you, and at {name}, and then sets off down the lane ahead of you both, unhurried as ever, as if the whole thing had been his idea.',
      },
      {
        line: 'You know where he is going. There is a pale patch on the boards at the west end of the stands, about the size of a Brindlekin.',
      },
    ],
  },
  {
    id: 'midwinter-desk',
    title: 'The promotion desk',
    beats: [
      {
        stage: {
          areaId: 'colosseum',
          minute: 600,
          season: 'winter',
          player: { x: -1.6, z: 5.4 },
          companion: { x: -2.4, z: 5.9 },
          pip: { x: OLD_RAIL.x - 0.4, z: OLD_RAIL.z + 0.8 },
        },
        line: 'Celia Vane writes the entry in the ledger herself. BRAMBLEWICK, it says, for the first time in fifteen winters. She blots it very carefully, and doesn’t look up until she is sure of her face.',
      },
      {
        speaker: 'Celia',
        line: 'Go on, then. They’re waiting. They have been waiting a good while.',
      },
      {
        line: 'At the west end of the stands, Pip has lain down on his patch of boards with his chin on his paws, facing the sand. There is room beside him at the rail for one more. People have left it.',
      },
    ],
  },
  {
    id: 'grand-champion',
    title: 'Grand Champion',
    beats: [
      {
        stage: {
          areaId: 'colosseum',
          minute: 930,
          player: { x: -3.2, z: -0.4 },
          companion: { x: -2.4, z: -0.9 },
          pip: { x: OLD_RAIL.x - 0.4, z: OLD_RAIL.z + 0.8 },
        },
        line: 'The last leg ends, and for a moment the whole Colosseum is quiet, the way a held breath is quiet. Then the chalk goes up on the board, and it is not quiet at all.',
      },
      {
        line: 'Hetty Larkspur crosses the sand to you. Fifteen winters Grand Champion. She is carrying the white ribbon in both hands, like something she was asked to mind.',
      },
      {
        speaker: 'Hetty',
        line: 'He handed me this the winter he walked away. Wouldn’t even let me win it off him fair. “Keep it warm,” he said. “Somebody will be along for it.”',
      },
      {
        speaker: 'Hetty',
        line: 'I thought he meant himself. Fifteen years I have been looking over my shoulder for that old man. …He meant you. He meant you the whole time, and you were about this big.',
      },
      {
        line: 'She pins it to {name}’s collar herself. Her hands aren’t quite steady. Neither are yours. {name} tries to eat it.',
      },
      {
        line: 'When you can see properly again, you look across to the west end of the stands. Pip is on his feet at the rail. He isn’t looking at the sand. He is looking at you.',
      },
      {
        stage: {
          areaId: 'road',
          minute: 1110,
          player: { x: -13.5, z: 0.2 },
          companion: { x: -14.3, z: 0.9 },
          pip: { x: -12.2, z: 0.9 },
        },
        line: 'He is at the gate of the grounds before you are. Nobody called him. He looks you over once, and {name} once, the way he used to look over the berries.',
      },
      {
        line: 'Then Pip falls in at your heel, unhurried as ever, and the three of you take the east road home.',
      },
      {
        stage: {
          ...HEARTH,
          minute: 1290,
          grandpa: undefined,
          pip: { x: 2, z: -2.3 },
          player: { x: 2.4, z: -3 },
          companion: { x: 3, z: -2.2 },
        },
        line: 'The tin is where you left it. You roll his ribbon out flat on the table beside {name}’s. His has gone the colour of cream. Otherwise you could not tell them apart. They haven’t changed the stitching.',
      },
      {
        line: 'There is only the one high nail. You hang them both on it. They will have to share.',
      },
      {
        line: 'Pip gets up into the chair and moves over. {name} takes the hearth. Somebody has to bank the fire, and see to the kettle, and remember how everything is done. You find that you do. You remember all of it.',
      },
      {
        line: 'Outside it is the last night of winter. The turnips will want judging soon.',
      },
    ],
  },
];

export function sceneById(id: string): StoryScene | undefined {
  return SCENES.find((scene) => scene.id === id);
}
