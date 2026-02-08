
import { useTTSContext } from '../contexts/TTSContext';

/**
 * useTTS Hook: Sovereign Vocal Synthesis Interface.
 * Consumes global TTS context for synchronized state across the OS.
 */
export const useTTS = () => {
  const context = useTTSContext();
  
  return {
    ...context,
    // Provide 'play' as the primary method for compliance with requirements
    play: context.play,
    // Maintain 'speak' as an alias for internal consistency
    speak: context.play,
  };
};
