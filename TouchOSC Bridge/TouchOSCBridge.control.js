//Enhanced Generic Controller Script with Support for
//- all 16 Midi Channels + Omni
//- Poly Aftertouch to Expression
//- CCs fully mappable per Midi Channel...
//- Sending Midi Beat Clock.
//- Sending Feedback to the Controller for the CCs

loadAPI(1);

host.defineController("TouchOSCBridge", "TouchOSCBridge", "1.0", "847dfbf0-ed5c-11e3-ac10-0800200c9a66");
host.defineMidiPorts(1, 1);
// enter the names for your controllers Midi In and Out ports here if you want autodetection:
host.addDeviceNameBasedDiscoveryPair(["YourMidiInPortNameHere"], ["YourMidiOutPortNameHere"]);

// CC 0 and CCs 120+ are reserved
var LOWEST_CC = 1;
var HIGHEST_CC = 110;

// Two array-variables to hold the values of all the CCs and to check if they have changed
var ccValue = initArray(0, ((HIGHEST_CC - LOWEST_CC + 1)*16));
var ccValueOld = initArray(0, ((HIGHEST_CC - LOWEST_CC + 1)*16));

// A function to create an indexed function for the Observers
function getValueObserverFunc(index, varToStore)
{
   return function(value)
   {
      varToStore[index] = value;
   }
}

function init()
{
	 
	 // Create 16 NoteInputs + Omni.
	 // Verbose to allow commenting out unneeded channels
	 // To do so, put "//" in front of the lines containing channels you don't want to use
	 // Be sure to do it for the "createNoteInput" lines as well as the corresponding
	 // "setShouldConsumeEvents" and "assignPolyphonicAftertouchToExpression" lines below
	 TouchOSCBridge   = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Omni", "??????");
   TouchOSCBridge1  = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 1", "?0????");
   TouchOSCBridge2  = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 2", "?1????");
   TouchOSCBridge3  = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 3", "?2????");
   TouchOSCBridge4  = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 4", "?3????");
   TouchOSCBridge5  = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 5", "?4????");
   TouchOSCBridge6  = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 6", "?5????");
   TouchOSCBridge7  = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 7", "?6????");
   TouchOSCBridge8  = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 8", "?7????");
   TouchOSCBridge9  = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 9", "?8????");
   TouchOSCBridge10 = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 10", "?9????");
   TouchOSCBridge11 = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 11", "?A????");
   TouchOSCBridge12 = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 12", "?B????");
   TouchOSCBridge13 = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 13", "?C????");
   TouchOSCBridge14 = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 14", "?D????");
   TouchOSCBridge15 = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 15", "?E????");
   TouchOSCBridge16 = host.getMidiInPort(0).createNoteInput("TouchOSCBridge - Ch 16", "?F????");
	 
	 // Disable the consuming of events by the NoteInputs, so they are also available for mapping
	 TouchOSCBridge.setShouldConsumeEvents(false);
	 TouchOSCBridge1.setShouldConsumeEvents(false);
	 TouchOSCBridge2.setShouldConsumeEvents(false);
   TouchOSCBridge3.setShouldConsumeEvents(false);
   TouchOSCBridge4.setShouldConsumeEvents(false);
   TouchOSCBridge5.setShouldConsumeEvents(false);
   TouchOSCBridge6.setShouldConsumeEvents(false);
   TouchOSCBridge7.setShouldConsumeEvents(false);
   TouchOSCBridge8.setShouldConsumeEvents(false);
   TouchOSCBridge9.setShouldConsumeEvents(false);
   TouchOSCBridge10.setShouldConsumeEvents(false);
   TouchOSCBridge11.setShouldConsumeEvents(false);
   TouchOSCBridge12.setShouldConsumeEvents(false);
   TouchOSCBridge13.setShouldConsumeEvents(false);
   TouchOSCBridge14.setShouldConsumeEvents(false);
   TouchOSCBridge15.setShouldConsumeEvents(false);
   TouchOSCBridge16.setShouldConsumeEvents(false);
	 
	 // Enable Poly AT translation into Timbre for the internal BWS instruments
	 TouchOSCBridge.assignPolyphonicAftertouchToExpression(0,   NoteExpression.TIMBRE_UP, 5);	 
	 TouchOSCBridge1.assignPolyphonicAftertouchToExpression(0,   NoteExpression.TIMBRE_UP, 5);
	 TouchOSCBridge2.assignPolyphonicAftertouchToExpression(1,   NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge3.assignPolyphonicAftertouchToExpression(2,   NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge4.assignPolyphonicAftertouchToExpression(3,   NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge5.assignPolyphonicAftertouchToExpression(4,   NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge6.assignPolyphonicAftertouchToExpression(5,   NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge7.assignPolyphonicAftertouchToExpression(6,   NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge8.assignPolyphonicAftertouchToExpression(7,   NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge9.assignPolyphonicAftertouchToExpression(8,   NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge10.assignPolyphonicAftertouchToExpression(9,  NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge11.assignPolyphonicAftertouchToExpression(10, NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge12.assignPolyphonicAftertouchToExpression(11, NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge13.assignPolyphonicAftertouchToExpression(12, NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge14.assignPolyphonicAftertouchToExpression(13, NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge15.assignPolyphonicAftertouchToExpression(14, NoteExpression.TIMBRE_UP, 5);
   TouchOSCBridge16.assignPolyphonicAftertouchToExpression(15, NoteExpression.TIMBRE_UP, 5);

	 // Enable Midi Beat Clock. Comment out if you don't want that
	 host.getMidiOutPort(0).setShouldSendMidiBeatClock;
	 
	 // Setting Callbacks for Midi and Sysex
   host.getMidiInPort(0).setMidiCallback(onMidi);
	 host.getMidiInPort(0).setSysexCallback(onSysex);
	 
   transport = host.createTransport();  // this creates the ability to control transport	 

   // Make CCs 1-119 freely mappable for all 16 Channels
   userControls = host.createUserControls((HIGHEST_CC - LOWEST_CC + 1)*16);

   for(var i=LOWEST_CC; i<=HIGHEST_CC; i++)
   {
			for (var j=1; j<=16; j++) {
				 // Create the index variable c
				 var c = i - LOWEST_CC + (j-1) * (HIGHEST_CC-LOWEST_CC+1);
				 // Set a label/name for each userControl
				 userControls.getControl(c).setLabel("CC " + i + " - Channel " + j);
				 // Add a ValueObserver for each userControl
	       userControls.getControl(c).addValueObserver(127, getValueObserverFunc(c, ccValue));
			}
   }
}

// Updates the controller in an orderly manner when needed
// so that LEDs, Motors etc. react to changes in the Software
// without drowning the Controller with data
function flush()
{
   for(var i=LOWEST_CC; i<=HIGHEST_CC; i++)
   {
			for (var j=1; j<=16; j++) {
				 var c = i - LOWEST_CC + (j-1) * (HIGHEST_CC-LOWEST_CC+1);
				 // Check if something has changed
				 if (ccValue[c] != ccValueOld[c]) {
						// If yes, send the updated value
						sendChannelController(j-1, i, ccValue[c]);
						// And update the value for the next check
						ccValueOld[c] = ccValue[c];
				 }
			}
   }
}

// Update the UserControls when Midi Data is received
function onMidi(status, data1, data2)
{
	 //printMidi(status, data1, data2);
	 
   if (isChannelController(status))
   {
      if (data1 >= LOWEST_CC && data1 <= HIGHEST_CC)
      {
         var index = data1 - LOWEST_CC + ((HIGHEST_CC-LOWEST_CC+1) * MIDIChannel(status));
         userControls.getControl(index).set(data2, 128);
      }
      if (data2 > 0)
      {
      // checking what CC value we get and react accordingly:
      switch (data1)  {
         case 117:
            transport.stop();
            break;
         case 118:
            transport.play();
            break;
         case 113:
            transport.restart();
            break;
         case 119:
            transport.record();
            break;
         case 114:
            transport.toggleOverdub();
            break;
		     }
      }
   }
}

function onSysex(data)
{
	//printSysex(data);
}

function exit()
{
	 // nothing to do here ;-)
}