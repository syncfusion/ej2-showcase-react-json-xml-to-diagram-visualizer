#!groovy

node('EJ2Angularlatest') {
    try {
        deleteDir()

        stage('Import') {
            git url: 'https://gitea.syncfusion.com/essential-studio/ej2-groovy-scripts.git', branch: 'master', credentialsId: env.GiteaCredentialID;
            shared = load 'src/shared.groovy'
        }

        stage('Checkout') {
            checkout scm
        }

        stage('Validation') {
            shared.getProjectDetails()
            shared.gitlabCommitStatus('running')
        }

        stage('Install') {
            sh 'npm install'
        }

        stage('Build') {
            sh 'gulp hide-license && npm run build && gulp finished'
        }

        stage('Publish') {
            shared.publish()
        }

        shared.gitlabCommitStatus('success')

        deleteDir()
    }
    catch(Exception e) {
        shared.throwError(e)
        deleteDir()
        error('Build Failed')     
    }
}
