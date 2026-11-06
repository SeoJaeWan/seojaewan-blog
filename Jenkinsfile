// seojaewan-blog-release: 공용 젠킨스(local-server)가 refs/heads/main의 변화를 2분마다 확인해 이 파일을 실행한다.
// @codocs [[배포 환경:배포(CD)]]
// 공통 규칙은 local-server 저장소의 .codocs/foundation/project-deploy.yaml(프로젝트 배포)이다.
//   1. deploy: 앱마다 package.json 버전·글 JSON을 실행 중인 컨테이너와 비교해 바뀐 앱만 빌드하고 바꾼다.
//      글 동기화 병합은 블로그만, 버전 PR 병합은 버전이 바뀐 앱만, 처음에는 둘 다 배포한다.
//   2. version PR: main에 쌓인 changeset이 있으면 버전 PR(chore/release)을 만들거나 갱신한다. 글 동기화 병합에서는 건너뛴다.
// 젠킨스는 main의 이 파일을 읽으므로, 이 파일을 바꾸면 다음 실행부터 적용된다.
pipeline {
  agent { label 'seojaewan-blog' }
  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 60, unit: 'MINUTES')
  }
  stages {
    stage('deploy') {
      steps {
        sh 'node deploy/deploy-changed.mjs'
      }
    }
    stage('version PR') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'github-app', usernameVariable: 'GH_APP', passwordVariable: 'GH_TOKEN')]) {
          sh 'node deploy/version-pr.mjs'
        }
      }
    }
  }
  post {
    failure {
      sh 'notify-failure "seojaewan-blog 배포 실패" "${BUILD_URL}console"'
    }
    // 배포 스크립트가 쓴 비밀값 파일을 실패나 중단에도 남기지 않는다
    cleanup {
      sh 'rm -rf .deploy-secrets'
    }
  }
}
