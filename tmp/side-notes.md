# How I Tamed Claude - Emmz Rendle - NDC London 2026

This talk was recorded at NDC London in London, England.

Emmz Rendle: I'm the CTO of a very small, very hi-tech company, which means I'm working on multiple things simultaneously.

To do this, I've developed a process for working with coding agents, particularly Claude Code, which allows me to switch context rapidly and do things I don't 100% know how to do myself.

In this talk I'll share the techniques I've learned, developed and refined that help me get solid, usable code that I can put into production with confidence. I'll show you how to write a detailed requirements document that an agent can work from; how to work through those requirements step by step in collaboration with your LLM; how to maintain state between sessions (which is helpful for me as well as Claude); and how to keep up with what it's doing so you can take responsibility for the solution long after its context window has closed forever.

I'll also share some thoughts about where junior developers fit into this new way of working, and how important it is that humans continue to be the primary agents in software engineering.

## Transcript
0:10 Hello. Hello. Welcome to the last afternoon of the week. ...
jump in a cab, go to Clark and Will and play bass. Um, so yes, this is how I
0:23
tamed Claude. Uh I submitted this talk for consideration by the committee I
0:29
think about six months ago. Claude was on like 1.0 something at that point. Um and I was
0:37
going to tell you all about CC sessions because CC sessions was this MCP server
0:43
that you plugged into Claude that gave it access to like a long-term memory and
0:49
planning and all this sort of stuff. The thing with this is that life comes
0:56
at you fast in the world of AI agents and everything. And so I'm not going to
1:01
tell you anything about CC sessions beyond the fact that this talk used to have that in it. It doesn't anymore.
1:08
There's something else now. Um, yes, the thing that I am actually going
1:13
to talk about, true story, uh, it's brilliant.
1:19
two, three days ago, three days ago now. Um, they released a completely new version that totally changes the way it
1:25
works and I have not had time to get my head around the way it works. Now, I am
1:32
assured by their migration guide that it is still essentially the same thing.
1:37
They've just changed the interface completely. There's a migration guide
1:42
and everything. So I will try to explain how that works. But fundamentally this
1:49
is a talk about how to work with AI agents generally and why you are not
1:58
programmers anymore. Uh we're going to go through three stages. I also have no idea how long
2:05
this is going to go on for now. I will try and keep it inside the hour. If it finishes early, we'll just have a Q&A
2:11
session. Um, so yes, [snorts] but we're going to go through the basics. So, who here is using um a coding agent of any
2:19
kind, GitHub, copilot, whatever. So, yeah, basically everybody. Um, who's using Claude?
2:26
Who's got some sucker to pay for Claude Max for $200 a month?
2:33
It's so good. [clears throat] Like three terminals open on three different computers doing three different things
2:38
and you're just there going, "Ha, I am a god." Um but no uh I do think that
2:47
Claude is the better of the coding agents that are
2:54
available and I do have reasons for this and I have tried I've tried Gemini uh
2:59
CLI I've tried uh Copilot both in VS Code and um on the command line uh I've
3:07
tried various integrations in various JetBrains IDE and I always ended up coming back to just going to my
3:15
terminal and typing `claude` and starting a session. And I think what it is that terminal
3:20
based workflow just makes it really really simple. You cd into the directory where the files
3:26
are that you want to work with. You start cla and it just goes am I all right to look at files and do things in
3:32
this directory and you say yes and you're off and running. And that's really nice. And it's you've got the
3:38
whole screen to have the conversation. It's not sort of tucked away in the side. Um and uh Chris down the front was
3:46
just saying he's introducing his team to it. And they were kind of like where's where's the editor? Where's the code?
3:51
Why can't I see the code? No, that's not how any of this works anymore. uh you
3:56
have a separate you can I have zed open on another um desktop and I can see the
4:02
code that's being written and I can review the code but I what I am essentially doing is micromanaging
4:08
things um claude is very low-level and configurable a lot of the other agents
4:13
are kind of they've got a lot their system prompts are very long and very
4:18
specific and uh like I'm pretty sure Gemini
4:23
kind of goes have you considered doing this in flutter and you're like uh no
4:30
and it goes all you really so yes um claud has got a lot of configuration
4:36
points is very very easy to configure you can mostly configure it with markdown files there standard ways of
4:42
doing that and it's actually when claude code does something like skills or
4:48
commands you then find the other ones come along and imitate that so you can
4:53
use those same features and uh and standards. Um but Anthropic have kind of
5:01
this is their focus. You feel like claude code is what Anthropic are building and selling and those $200 a
5:09
month subscriptions are Anthropic's path to monetization. They're not going to be putting ads in clawed code. They're not
5:16
struggling to find what they're doing. They're basically going, "Let's get every programmer on the planet giving us
5:22
$200 a month uh in order to use our product." Um, and a lot of people do.
5:29
And that means it's the most popular. And so anytime you see anything about, you know, as a new coding agent, how
5:36
does it compare to Claude? Um, and so that popularity means that there's an ecosystem. There's a lot of awesome
5:42
Claude blah uh repositories on GitHub and everything else. And like I say,
5:47
I've tried other things and I keep coming back to it. Um, I found this quote while I was doing the research
5:52
from Andre Carpathy. Uh, it's not just a website you go to like Google. It's a little spirit or ghost that lives on
6:00
your computer. And it actually it is like that especially the desktop. So I have claude code which is where I do the
6:06
coding and the generative stuff and I have claude desktop which I use for
6:11
other things and claude desktop has like projects and it has a long-term memory
6:17
[snorts] across the entire thing and sometimes I'll just start a new chat and ask it something and it knows that we're
6:24
talking about something that I mentioned to it six weeks ago and it's still got that in there. Um, and it is it's like
6:31
uh like an assistant that actually knows what you're doing. So, let's talk about
6:37
the basics. And the absolute basic thing that you need with Claude is a good
6:42
claude.md file. And actually, you can have multiple Claude MD files. You can have one that lives in your home
6:49
directory and a sort of claude and you put a claw.md in there. And that's kind
6:54
of basic instructions for claude across your entire system, any projects you're working in. And then you can also put a
7:00
claude.md into uh your project directory. And that gives it specific
7:06
directions for that project. And you can start off with, you know, we have the bash commands to do an mpm uh run the
7:14
build. Uh we can talk about the code style. And you end up telling Claude to
7:20
update its own claude.mmd file to make notes that it needs to do something. And that's where you would put stuff like we
7:27
are doing testdriven development. Write the test first then make it pass. Uh
7:32
always plan, always make sure you've answered questions. All that sort of stuff goes into claude uh.md.
7:39
Um, and so some tips for claude.md that I've kind of either found or or uh
7:47
discovered along the way. Um, you can link to documents using at as the
7:53
prefix. And you can do this when you're typing directly into chord code on the CLI. You just do at and then you'll
7:59
start to get autocomplete for files and directories that it can see. But if you do that inside your markdown files and
8:07
link between them in that way, it's like having sort of anchor links in uh markdown and it gives it sort of
8:15
specific instructions to say yes, I do actually want you to read that file and consider that content there. Um
8:22
I do a lot of I've got a side project that I'm working on which you're going to love and I'm going to sell it to
8:28
Apple in about five years for hundred million dollars. Um, and it's going to
8:33
take over the world and replace operating systems. Um, and I'm building that. Uh, and in that one, I am just
8:41
letting Claude run completely riot. And so the claude.mmd file is maintained by Claude. Uh, if we say we're going to do
8:47
something, it makes the most of it in there. There's an agents.mmd file and all sorts of other stuff. If you are
8:53
working as part of a team and you're all building stuff together, Claude creates
8:58
a claude directory inside the project and that should be added into source
9:04
control. Despite starting with dot, you should definitely be checking all that into source control. And then in there
9:10
you can have essentially the coding guidelines and and uh team guidelines
9:17
that you would have for onboarding a new person onto your team should all be encoded into your claw.md file so that
9:25
every time it starts up it loads about 15 20k of of markdown and then it knows
9:31
what it's supposed to be doing. And yeah, you can put the standard commands
9:36
that you need to run, what your code style is going to be, uh, tell it to look at the editor config to understand
9:42
the code style, um, make a record of your architecture design records and all
9:49
those sorts of things can go into that claw.md file.
9:55
Then there are the commands that you have when you're actually inside clawed code. And I'm just gonna actually bring
10:03
up a a session and we'll do something. So
10:10
there is nothing up my sleeve. Uh so we will do claude
 
10:58 [So I'm inside Claude] Code empty directory. So I'm going to do /init
11:04
and it's going to create some stuff.
11:09
Um and it's searching for patterns and the directory appears to be empty. Let me verify this. So this is going to
11:16 create the CLAUDE.md file and then you can go through a process and it says right I
11:24
to create a useful claw.md file I need a code base to analyze uh tell me what
11:29
kind of project you want to create add some code first or create a placeholder
11:35
and I'm just going to say three at this point because
11:40
we are just going to uh we're going to do a bunch of other stuff before we
11:46
decide what kind of project we want to create. And it says, "Do you want to create claude.md?"
11:53
You get yes and then yes, allow all edits during this session. That second
12:00
one is kind of interesting. Um it's generally okay for setup and and that
12:07
sort of thing, but um it can be a bit dodgy. uh and you can sort of say don't
12:14
touch any of the files in that directory. Do not edit that directory. So now saying I've created a minimal
12:19
claw.md template. So, if I exit out of there, um, and
12:25
we'll do Z dot and
12:33
uh, view zoom in,
12:40
right? So, yes, this is your sort of
12:45
placeholder claude.mmd file. Um, and you can put your build and dev
12:52
commands and all this sort of stuff. And then various other things will add to your claude file as you are going along.
12:59
So going to go back in again now.
13:09
Okay. Um, the next one that is very very important is slash context. So Claude
13:17
has a context window of 200,000 tokens. It's a decent size. You can do most of
13:23
the things that you should be doing with Claude inside a 100,000 tokens. And you
13:30
should aim for a 100,000 tokens. As you're sort of progressing through your session and achieving something, run
13:37
slashcontext quite frequently. It will be filling up and filling up and filling up. Once it gets to like 80 90 95% it
13:45
will autoco compact. And what compact means is it clears that context but it
13:51
kind of summarizes everything that's been done. If you get to that point you
13:57 need to either run another command which is slashcle or you need to do what I do
14:02 which is exit claude and restart it which kind of because I'm never sure whether slashclear is really clearing.
14:09
Uh but I know that if I exit it and start it again, then it's actually starting a new session. And you can see
14:15
what's using tokens in here. We've got MCP tools. There's only one MCP tool uh attached to this at the moment. And
14:22
that's uh we'll talk about that later on. Um you can see the system prompt, the system tools, skills, memory files,
14:29
all these sorts of things. Uh once you get past a 100,000 tokens, it actually
14:35
starts to become less effective. uh especially if you're using Opus and if you have a Mac subscription, you can
14:41
just put it on Opus 4.5 and leave it on that and actually have three sessions running all using Opus because they made
14:47
it much cheaper. Um so yes, uh once it gets past 100,000 tokens, it's like it's
14:53
got too much information. It's like when you are holding too much state in your
14:58
head. You know that that moment where someone comes along and goes, "Could you just look at this?" and you stab them to
15:04
death because they've completely broken your flow and it's going to take you two days to get back into it. So yes, once
15:10
it gets past 100,000, kill it and start again or finish get it to finish what
15:16
it's doing, but we're going to talk more about that. Um, so yes, we have that and
15:21
then we can also we can say MCP tell me what MCP servers I am actually using.
15:26
You see there it's using context 7. We'll talk about that uh in a moment.
15:33
And we can do slashskills and we'll talk about skills. No skills found, but we'll do something about that
15:39
later. And um so yes, and there is slashcle, which clears conversation
15:47
history and frees up context and slash compact. So it will autocompact once it
15:52
hits the limit. But you can run slash compact, but never do that. Uh, and
15:58
never run clear. Just once you get past a 100,000 tokens, get to a nice stopping point, tell it to record its progress or
16:05
whatever it's doing, and then uh kill it and start a new one. This is why Ralph
16:12
works so well. I am not going to talk about Ralph, okay? Because I don't use a
16:18
Ralph. I haven't used Ralph. I haven't tried it. I'm I'm meaning to try it, but it's kind of finding something that it
16:23
makes sense to use on it. And so I'm not claiming that this is the complete list of best practices. This is what I do. It
16:30
works for me. I've shipped stuff with it. It's it's good. Okay,
16:41
let's go back to here and then we'll do the um keyboard shortcut to start it from
16:49
the current slide. Play from There we go.
16:54
exit command. I just keep doing C control C and everything. Yeah, that works too.
17:00
Um, so yes, there are a bunch of other commands and if you type slash, you get autocomplete on them and uh it'll sort
17:09
of explain what they all are and everything, but those are the ones that I use on a regular basis in a particular
17:14
session. Um, that's how many tokens are in the context window. Uh that's how
17:20
many you should sort of you treat it as a soft limit. Try to stay below that.
17:26
All right, let's talk about workflow. Um who would characterize what they do
17:32
as vibe coding? Yeah, nobody's going to admit to that, are they?
17:39
But you know who you are. Uh yeah, this is not vibe coding. Vibe coding is for
17:46
people who think they can build a startup and make millions of dollars without hiring anybody who knows
17:52
anything about creating software. Uh the rest of us are trying to use this as a
17:58
tool to do the thing that we know how to do but more quickly and in new and
18:04
interesting ways. And so when I work with Claude, it has four personalities
18:13
that I use. Um I have an analyst mode and that is I've got an idea for
18:20
something that I want to build and I'm going to go the analyst is going to help me describe it. Then I have an architect
18:25
who creates a spec, plans the implementation, a developer who does test-driven development and builds the
18:32
system, and a reviewer who after each feature is complete can review the code.
18:37
The great thing about L. I had this weird notion when I first
18:42
started this. I would use Claude to generate the code because it was the better one for doing that and then I
18:49
would use Gemini to review it because I was like, well, I'll get a different LLM to review it. But that's not how LLMs
18:54
work. You can sort of stop Claude, start it again, and then go review this code.
19:00
And he goes, "Oh, that's interesting. I've never seen this code before." You're like, "You just wrote it." No, no, no, no, no. This is completely fresh
19:06
to me. So, yes. So, let's talk about the analyst mode and let's talk about system prompts. Um, the analyst is going to do
19:13
requirements gathering. The analyst is going to interview me and ask me
19:18
questions and gather the information. And I'm going to say, I want to build a
19:24
chatbot with voice recognition and text to speech. And the analyst is going to
19:31
ask me questions about that. How does it work? What platform is it going to run on? Uh what are the constraints? Do you
19:37
want to use a cloud model or a local ondevice model? All these sorts of things. And so I have a system prompt
19:44
called analyst. It's in a file called analyst.md. And
19:50
uh system prompts are quite long and contain quite a lot of instructions and they're very tricky things to write well
19:57
and properly. But there's a crapload of them out there on the internet and on GitHub in open source projects. And so
20:06
one thing that LLMs are really good at is writing system prompts for LLMs. And
20:11
so so I can go into Claude and this is where I use Claude desktop. It's one of
20:17
the things that I use Claude desktop for. I'll stop adjust stop doing this because that's the microphone. Um, and
20:23
so I can go into Claude desktop.
20:31
Um, and I can say uh create a system prompt
20:42
uh file document for a requirements analyst
20:51
that gathers information and uh
21:00
constraints questions
21:06
to produce a requirements.md
21:15
document that a solution architect can
21:20
use to design the solution and plan the
21:29
implementation.
21:36
and Claude will go off and do that. Now, if I have upfront information, let's say
21:43
I'm working in a place where every single programmer is a .NET developer, so I know we're going to do this inn
21:49
.NET, then I would uh go in and say it's it we know it's going to be .NET and
21:55
that gives it information. So for every project, I don't have a standard prompt.
22:00
I use Claude to help me build the system prompt for that particular project. And
22:06
what I would actually do is if I knew what the project was, I would tell it at this point so that the requirements
22:13
analyst AI assistant knew what we were building and knew what to ask questions about and I could put sort of the the
22:20
fundamental like three or four line description uh in there. Um, and then
22:25
you can see it has it's generated all these sorts of things. [snorts]
22:32
Um, and this is this is just Sonnet running this. Uh, if you aren't lucky
22:37
enough to have a Claude Max subscription, which lets you use Opus for eight hours a day. Um, then Sonnet
22:44
4.5 is really good and the $20 a month subscription, you can kind of get four
22:50
to six hours a day out of it, I think. Um, but yes, there you go. This is that's a
22:58
system prompt and it creates the file.
23:04
Presenting the file. Come on. Present the There we go. Um, puts it over on
23:10
that side there. And then I can just uh Yes, I know what you've done. I told
23:17
you to do it. I can go to here. Uh, next try. Try this in co-work. I
23:24
haven't tried co-work yet. I honestly don't know what it does. Um, so then I'm going to go to here. I'm going to create
23:30
a new file and call it analyst.m MD. And then I'm going to paste all of
23:36
that stuff in there and write that. And then I'm going to go back to my command
23:41
line. Uh, and we're going to do /clear. And then
23:48 we are going to run claude d-systemprompt
23:54 file analyst.mmd. Okay.
24:01 So system prompt is the thing that tells the AI assistant what it is. Now there
24:08 is a core system prompt that you can't override. Uh that's fundamental to
24:13 claude. Then there is a Claude Code system prompt and there's a default one and it's kind of like you're a
24:19 programmer. That's it. We now have a detailed system prompt that we've created and you know if I was actually
24:26 creating this I would have read through that and checked on things and maybe made some edits or maybe asked Claude to
24:31 make some changes to it. Uh that sort of thing. But so now I have Claude code but
24:37 it thinks it's a requirements analyst. I can prove that. I can say who are you
24:45 and it should non-deterministically
24:50 tell me what it is. Um, so yeah, there you go. I'm Claude Code, but I've been
24:57 configured with a specialized role as a requirements analyst. In this role, I and it tells you what you've configured
it to do. Okay, so now we have phase 1 of our workflow.  
[25:07](https://www.youtube.com/watch?v=pey9u_ANXZM&t=1507s)
And this is where we as developers, as people who are paid to create software,
this is how we differentiate ourselves from those idiots vibe coding things,
boasting about it on bloody X one day going: "I've launched my SAS in five days
 and I vibe coded the whole thing and I haven't even looked at any of the code!"
 And then the next day going: "I'm under attack! Help! Why is my OAuth system not working?"
[25:38](https://www.youtube.com/watch?v=pey9u_ANXZM&t=1538s) We are micromanagers of a very small team of insanely brilliant but also bloody stupid experts.  And our job is to do all of those things.  So if you ever wanted to call yourself an architect, now you're learning what architect means and what it involves and how you're not sort of necessarily learning how to do it.  You're learning to manage an architect.
26:12 And you might learn something about being an architect along the way...
