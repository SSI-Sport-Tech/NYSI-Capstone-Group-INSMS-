from openai import OpenAI

client = OpenAI(
  api_key="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"
)

response = client.responses.create(
  model="gpt-5-nano",
  input="write a haiku about ai",
  store=True,
)

print(response.output_text)


"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"