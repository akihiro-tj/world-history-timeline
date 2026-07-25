Feature: オンボーディング

  @onboarding
  Scenario: オンボーディングを閉じてリロードすると再表示されない
    Given ページを開く
    Then オンボーディングが表示される
    When "はじめる"ボタンをクリックする
    Then オンボーディングが表示されない
    When ページをリロードする
    Then オンボーディングが表示されない
