"""
Creative Essay Writer - An Intelligent Essay Generation System

This module provides a comprehensive essay writing system that generates
creative, insightful, and well-structured essays with descriptive language
and clear organization.
"""

import random
import textwrap
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum


class EssayStyle(Enum):
    """Essay writing styles"""
    DESCRIPTIVE = "descriptive"
    NARRATIVE = "narrative"
    EXPOSITORY = "expository"
    PERSUASIVE = "persuasive"
    CREATIVE = "creative"


class ToneType(Enum):
    """Writing tone types"""
    FORMAL = "formal"
    INFORMAL = "informal"
    ANALYTICAL = "analytical"
    REFLECTIVE = "reflective"
    ENTHUSIASTIC = "enthusiastic"


@dataclass
class EssayConfig:
    """Configuration for essay generation"""
    topic: str
    style: EssayStyle = EssayStyle.CREATIVE
    tone: ToneType = ToneType.REFLECTIVE
    min_paragraphs: int = 5
    max_paragraphs: int = 8
    creativity_level: float = 0.8  # 0.0 to 1.0
    use_metaphors: bool = True
    use_transitions: bool = True
    

class SentenceEnhancer:
    """Enhances sentences with creative and descriptive elements"""
    
    DESCRIPTIVE_ADJECTIVES = [
        "profound", "intricate", "nuanced", "multifaceted", "compelling",
        "thought-provoking", "illuminating", "captivating", "remarkable",
        "extraordinary", "fascinating", "intriguing", "perplexing", "enigmatic"
    ]
    
    TRANSITION_PHRASES = {
        "addition": ["Moreover", "Furthermore", "Additionally", "In addition", 
                    "What is more", "Beyond this"],
        "contrast": ["However", "Nevertheless", "On the other hand", "Conversely", 
                    "In contrast", "Yet"],
        "causation": ["Consequently", "Therefore", "Thus", "As a result", 
                     "Hence", "Accordingly"],
        "elaboration": ["In other words", "To put it differently", "That is to say",
                       "Specifically", "In particular"],
        "conclusion": ["Ultimately", "In essence", "Fundamentally", "At its core",
                      "In the final analysis"]
    }
    
    METAPHORICAL_LANGUAGE = [
        "serves as a lens through which",
        "acts as a bridge between",
        "weaves together threads of",
        "paints a vivid picture of",
        "illuminates the landscape of",
        "echoes throughout",
        "resonates deeply with",
        "stands as a testament to"
    ]
    
    @classmethod
    def add_descriptive_element(cls, base_text: str, creativity: float) -> str:
        """Add descriptive adjectives to enhance text"""
        if random.random() < creativity:
            adjective = random.choice(cls.DESCRIPTIVE_ADJECTIVES)
            return f"{adjective} {base_text}"
        return base_text
    
    @classmethod
    def get_transition(cls, transition_type: str) -> str:
        """Get a transition phrase"""
        if transition_type in cls.TRANSITION_PHRASES:
            return random.choice(cls.TRANSITION_PHRASES[transition_type])
        return random.choice(cls.TRANSITION_PHRASES["addition"])
    
    @classmethod
    def add_metaphor(cls, text: str) -> str:
        """Add metaphorical language"""
        metaphor = random.choice(cls.METAPHORICAL_LANGUAGE)
        return f"{text} {metaphor}"


class ParagraphGenerator:
    """Generates creative and insightful paragraphs"""
    
    def __init__(self, config: EssayConfig):
        self.config = config
        self.enhancer = SentenceEnhancer()
    
    def generate_introduction(self) -> str:
        """Generate a compelling introduction paragraph"""
        topic = self.config.topic
        
        # Hook sentence
        hooks = [
            f"In the vast tapestry of human experience, few subjects captivate the imagination quite like {topic}.",
            f"Throughout history, {topic} has served as both a mirror and a window into the human condition.",
            f"The exploration of {topic} reveals layers of complexity that challenge our conventional understanding.",
            f"At the intersection of thought and experience lies {topic}, a subject that demands our careful attention.",
            f"When we contemplate {topic}, we embark on a journey that transcends simple explanation."
        ]
        
        # Context sentence
        context_patterns = [
            f"This {self.enhancer.add_descriptive_element('subject', self.config.creativity_level)} has shaped countless perspectives and continues to influence how we perceive the world around us.",
            f"The significance of {topic} extends far beyond surface-level interpretation, inviting deeper philosophical inquiry.",
            f"As we delve into the intricacies of {topic}, we discover connections that illuminate broader truths about existence.",
            f"The multifaceted nature of {topic} demands an approach that embraces both analytical rigor and creative insight."
        ]
        
        # Thesis statement
        thesis_patterns = [
            f"Through a comprehensive examination of {topic}, we can uncover fresh perspectives that challenge established paradigms and offer new pathways for understanding.",
            f"By exploring {topic} through multiple lenses, we reveal not only its inherent complexity but also its profound relevance to contemporary discourse.",
            f"An in-depth analysis of {topic} demonstrates how seemingly disparate concepts converge to create a rich tapestry of meaning and significance."
        ]
        
        intro = f"{random.choice(hooks)} {random.choice(context_patterns)} {random.choice(thesis_patterns)}"
        return intro
    
    def generate_body_paragraph(self, focus: str, paragraph_num: int) -> str:
        """Generate an insightful body paragraph"""
        
        # Topic sentence
        topic_sentences = [
            f"{self.enhancer.get_transition('addition')}, examining {focus} reveals {self.enhancer.add_descriptive_element('dimensions', self.config.creativity_level)} that merit careful consideration.",
            f"The relationship between {self.config.topic} and {focus} {self.enhancer.add_metaphor('demonstrates')} understanding.",
            f"{self.enhancer.get_transition('elaboration')}, when we analyze {focus}, we encounter perspectives that fundamentally reshape our comprehension.",
            f"One cannot fully appreciate {self.config.topic} without exploring how {focus} contributes to its broader significance."
        ]
        
        # Supporting sentences
        supporting = [
            f"This aspect manifests in ways both subtle and profound, influencing not only individual perception but also collective understanding.",
            f"The interplay between various elements creates a dynamic that enriches our interpretation and expands the boundaries of conventional analysis.",
            f"Historical context provides valuable insights, yet contemporary relevance ensures that these observations remain vitally important.",
            f"Through careful examination, we discover patterns that connect seemingly disparate ideas into a coherent framework of meaning."
        ]
        
        # Evidence/elaboration
        elaboration = [
            f"Consider how this {self.enhancer.add_descriptive_element('concept', self.config.creativity_level)} operates across different contexts, adapting and evolving while maintaining its essential character.",
            f"The implications extend beyond immediate application, suggesting broader principles that inform how we approach related subjects.",
            f"Evidence from diverse sources converges to support this interpretation, creating a compelling narrative that withstands scrutiny.",
            f"What emerges is not merely an isolated observation but rather a fundamental principle with far-reaching consequences."
        ]
        
        # Concluding sentence
        conclusions = [
            f"{self.enhancer.get_transition('causation')}, understanding {focus} becomes essential to grasping the full scope of {self.config.topic}.",
            f"These insights collectively illuminate why {focus} deserves sustained attention and thoughtful reflection.",
            f"The synthesis of these observations reveals connections that deepen our appreciation of the subject's complexity."
        ]
        
        paragraph = f"{random.choice(topic_sentences)} {random.choice(supporting)} {random.choice(elaboration)} {random.choice(conclusions)}"
        return paragraph
    
    def generate_conclusion(self) -> str:
        """Generate a powerful conclusion paragraph"""
        topic = self.config.topic
        
        # Restatement
        restatements = [
            f"{self.enhancer.get_transition('conclusion')}, our exploration of {topic} has traversed terrain both familiar and uncharted, revealing insights that challenge and inspire.",
            f"The journey through the complexities of {topic} brings us to a deeper understanding that transcends initial expectations.",
            f"As we synthesize the various threads of analysis woven throughout this examination, a comprehensive picture emerges."
        ]
        
        # Synthesis
        synthesis = [
            f"Each facet examined contributes to a holistic understanding that recognizes both nuance and overarching patterns.",
            f"The connections discovered between different aspects illuminate fundamental truths that resonate across contexts.",
            f"What began as separate observations coalesces into an integrated perspective that honors complexity while offering clarity."
        ]
        
        # Final thought
        final_thoughts = [
            f"Moving forward, these insights serve not as endpoints but as invitations to continue exploring, questioning, and discovering new dimensions of understanding.",
            f"The implications ripple outward, suggesting applications and interpretations that extend well beyond this initial exploration.",
            f"In recognizing the depth and breadth of {topic}, we open ourselves to ongoing dialogue and evolving perspectives that enrich both individual and collective wisdom.",
            f"Perhaps most importantly, this examination reminds us that true understanding requires not only intellectual rigor but also creative imagination and openness to fresh perspectives."
        ]
        
        conclusion = f"{random.choice(restatements)} {random.choice(synthesis)} {random.choice(final_thoughts)}"
        return conclusion


class EssayWriter:
    """Main essay writing system"""
    
    def __init__(self, config: EssayConfig):
        self.config = config
        self.paragraph_generator = ParagraphGenerator(config)
    
    def _generate_body_focuses(self) -> List[str]:
        """Generate focus topics for body paragraphs"""
        body_paragraph_count = random.randint(
            self.config.min_paragraphs - 2,  # Subtract intro and conclusion
            self.config.max_paragraphs - 2
        )
        
        # Generate varied focus areas
        focus_templates = [
            "the historical evolution of",
            "the contemporary relevance of",
            "the philosophical implications of",
            "the practical applications of",
            "the theoretical framework surrounding",
            "the cultural significance of",
            "the psychological dimensions of",
            "the societal impact of",
            "the ethical considerations within",
            "the transformative potential of"
        ]
        
        focuses = []
        used_templates = random.sample(focus_templates, min(body_paragraph_count, len(focus_templates)))
        
        for template in used_templates:
            focuses.append(f"{template} {self.config.topic}")
        
        return focuses
    
    def generate_essay(self) -> str:
        """Generate a complete creative essay"""
        essay_parts = []
        
        # Title
        title = self._generate_title()
        essay_parts.append(title)
        essay_parts.append("=" * len(title))
        essay_parts.append("")
        
        # Introduction
        intro = self.paragraph_generator.generate_introduction()
        essay_parts.append(self._format_paragraph(intro))
        essay_parts.append("")
        
        # Body paragraphs
        body_focuses = self._generate_body_focuses()
        for i, focus in enumerate(body_focuses, 1):
            body_para = self.paragraph_generator.generate_body_paragraph(focus, i)
            essay_parts.append(self._format_paragraph(body_para))
            essay_parts.append("")
        
        # Conclusion
        conclusion = self.paragraph_generator.generate_conclusion()
        essay_parts.append(self._format_paragraph(conclusion))
        
        return "\n".join(essay_parts)
    
    def _generate_title(self) -> str:
        """Generate a creative title"""
        title_patterns = [
            f"Exploring the Depths of {self.config.topic}: A Fresh Perspective",
            f"{self.config.topic}: An Insightful Journey Through Complexity",
            f"Beyond the Surface: Understanding {self.config.topic}",
            f"The Multifaceted Nature of {self.config.topic}",
            f"Illuminating {self.config.topic}: New Insights and Reflections",
            f"A Comprehensive Exploration of {self.config.topic}"
        ]
        return random.choice(title_patterns)
    
    def _format_paragraph(self, text: str, width: int = 80) -> str:
        """Format paragraph with proper line wrapping"""
        return textwrap.fill(text, width=width)


def create_essay(
    topic: str,
    style: str = "creative",
    tone: str = "reflective",
    min_paragraphs: int = 5,
    max_paragraphs: int = 8
) -> str:
    """
    Create a creative, insightful essay on the given topic.
    
    Args:
        topic: The subject matter of the essay
        style: Writing style (descriptive, narrative, expository, persuasive, creative)
        tone: Writing tone (formal, informal, analytical, reflective, enthusiastic)
        min_paragraphs: Minimum number of paragraphs
        max_paragraphs: Maximum number of paragraphs
    
    Returns:
        A complete, well-structured essay
    
    Raises:
        ValueError: If invalid style or tone is provided
    """
    try:
        config = EssayConfig(
            topic=topic,
            style=EssayStyle(style.lower()),
            tone=ToneType(tone.lower()),
            min_paragraphs=min_paragraphs,
            max_paragraphs=max_paragraphs
        )
    except ValueError as e:
        valid_styles = [s.value for s in EssayStyle]
        valid_tones = [t.value for t in ToneType]
        raise ValueError(
            f"Invalid configuration: {e}\n"
            f"Valid styles: {', '.join(valid_styles)}\n"
            f"Valid tones: {', '.join(valid_tones)}"
        )
    
    writer = EssayWriter(config)
    return writer.generate_essay()


# Command-line interface
if __name__ == "__main__":
    import sys
    
    print("=" * 80)
    print("Creative Essay Writer - Intelligent Essay Generation System")
    print("=" * 80)
    print()
    
    if len(sys.argv) > 1:
        topic = " ".join(sys.argv[1:])
    else:
        print("Please provide a topic for your essay.")
        print("Example: python essay_writer.py 'The Impact of Technology on Modern Society'")
        print()
        topic = input("Enter your essay topic: ")
    
    if not topic.strip():
        print("Error: Topic cannot be empty!")
        sys.exit(1)
    
    print(f"\nGenerating creative essay on: '{topic}'")
    print("Please wait...\n")
    
    essay = create_essay(topic)
    
    print(essay)
    print("\n" + "=" * 80)
    print("Essay generation complete!")
    print("=" * 80)
