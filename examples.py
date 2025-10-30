"""
Example usage of the Creative Essay Writer System

This module demonstrates various ways to use the essay writer
with different configurations and styles.
"""

from essay_writer import create_essay, EssayConfig, EssayStyle, ToneType, EssayWriter


def example_basic_usage():
    """Basic usage example"""
    print("=" * 80)
    print("EXAMPLE 1: Basic Usage")
    print("=" * 80)
    print()
    
    essay = create_essay("The Nature of Creativity")
    print(essay)
    print("\n\n")


def example_custom_style():
    """Custom style and tone example"""
    print("=" * 80)
    print("EXAMPLE 2: Custom Style and Tone")
    print("=" * 80)
    print()
    
    essay = create_essay(
        topic="Artificial Intelligence and Human Consciousness",
        style="expository",
        tone="analytical",
        min_paragraphs=6,
        max_paragraphs=9
    )
    print(essay)
    print("\n\n")


def example_advanced_configuration():
    """Advanced configuration example"""
    print("=" * 80)
    print("EXAMPLE 3: Advanced Configuration")
    print("=" * 80)
    print()
    
    config = EssayConfig(
        topic="The Evolution of Language and Thought",
        style=EssayStyle.DESCRIPTIVE,
        tone=ToneType.ENTHUSIASTIC,
        min_paragraphs=5,
        max_paragraphs=7,
        creativity_level=0.9,
        use_metaphors=True,
        use_transitions=True
    )
    
    writer = EssayWriter(config)
    essay = writer.generate_essay()
    print(essay)
    print("\n\n")


def example_multiple_essays():
    """Generate multiple essays on different topics"""
    print("=" * 80)
    print("EXAMPLE 4: Multiple Essays")
    print("=" * 80)
    print()
    
    topics = [
        "The Philosophy of Time",
        "Digital Identity in the Modern Age",
        "The Power of Storytelling"
    ]
    
    for i, topic in enumerate(topics, 1):
        print(f"\n--- Essay {i}: {topic} ---\n")
        essay = create_essay(topic, min_paragraphs=4, max_paragraphs=5)
        print(essay)
        print("\n")


def run_all_examples():
    """Run all example demonstrations"""
    example_basic_usage()
    example_custom_style()
    example_advanced_configuration()
    example_multiple_essays()


if __name__ == "__main__":
    import sys
    
    print("\nCreative Essay Writer - Example Demonstrations\n")
    print("Choose an example to run:")
    print("1. Basic Usage")
    print("2. Custom Style and Tone")
    print("3. Advanced Configuration")
    print("4. Multiple Essays")
    print("5. Run All Examples")
    print()
    
    if len(sys.argv) > 1:
        choice = sys.argv[1]
    else:
        choice = input("Enter your choice (1-5): ")
    
    examples = {
        "1": example_basic_usage,
        "2": example_custom_style,
        "3": example_advanced_configuration,
        "4": example_multiple_essays,
        "5": run_all_examples
    }
    
    if choice in examples:
        examples[choice]()
    else:
        print("Invalid choice. Please run again and select 1-5.")
