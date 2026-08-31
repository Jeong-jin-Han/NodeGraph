PDF_ABSOLUTE_PATH = <PDF_ABSOLUTE_PATH>
PROJECT_FOLDER = dirname(PDF_ABSOLUTE_PATH)

PROJECT_FOLDER/.agent/NODEGRAPH_SPEC.md 와 PROJECT_FOLDER/.agent/ENVIRONMENT.md
파일은 이미 준비돼 있어 — 둘 다 꼼꼼히 읽어줘.

이 논문과 방금 읽은 두 파일을 바탕으로, 어떤 nodegraph를 만들 수 있을지 먼저
간단히 설명해줘. 참고할 만한 예시로 확장 설치 폴더 안의
demo/ex1/attention-is-all-you-need.nodegraph.json이 있으니, 도움이 되면
봐도 좋고, 그 정도 깊이/구조로 이 논문 버전도 만들어줘.

모든 노드 내용은 한국어로 작성해. 단, 논문에서 쓰인 전문 용어는 임의로
의역하지 말고 그 분야에서 실제 쓰이는 정확한 학술 용어를 사용하고, 핵심
용어는 처음 등장할 때 원문 영어 표현을 괄호로 병기해(예: "다중 헤드
주의(multi-head attention)").

스펙 그대로 따르고, 결과물은 PROJECT_FOLDER 안에 저장한 다음, 중간에 나한테
아무것도 안 물어보고 끝까지 진행해줘. 다 되면 알려줘.
