require 'minitest/autorun'
require 'tmpdir'
require 'open3'
require 'xcodeproj'

class IOSSigningTests < Minitest::Test
  def test_only_app_receives_distribution_profile
    Dir.mktmpdir do |directory|
      path = File.join(directory, 'App.xcodeproj')
      project = Xcodeproj::Project.new(path)
      project.new_target(:application, 'App', :ios, '15.0')
      dependency = project.new_target(:bundle, 'GoogleSignIn_GoogleSignIn', :ios, '15.0')
      before = dependency.build_configurations.map { |config| config.build_settings.dup }
      project.save

      output, status = Open3.capture2e(
        { 'TEAM_ID' => 'TESTTEAM01', 'PROFILE_UUID' => 'test-profile', 'PROFILE_BUNDLE_ID' => 'nz.co.savo.app' },
        RbConfig.ruby, File.join(__dir__, 'configure-ios-signing.rb'), path
      )
      assert status.success?, output
      saved = Xcodeproj::Project.open(path)
      app = saved.targets.find { |target| target.name == 'App' }
      app.build_configurations.each do |config|
        assert_equal 'YES', config.build_settings['CODE_SIGNING_ALLOWED']
        assert_equal 'Apple Distribution', config.build_settings['CODE_SIGN_IDENTITY[sdk=iphoneos*]']
        assert_equal 'test-profile', config.build_settings['PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]']
        assert_equal 'nz.co.savo.app', config.build_settings['PRODUCT_BUNDLE_IDENTIFIER']
      end
      package = saved.targets.find { |target| target.name == 'GoogleSignIn_GoogleSignIn' }
      assert_equal before, package.build_configurations.map(&:build_settings)
    end
  end

  def test_missing_signing_values_fail_before_opening_project
    output, status = Open3.capture2e(
      { 'TEAM_ID' => '', 'PROFILE_UUID' => '', 'PROFILE_BUNDLE_ID' => '' },
      RbConfig.ruby, File.join(__dir__, 'configure-ios-signing.rb'), '/missing/App.xcodeproj'
    )
    refute status.success?
    assert_includes output, 'Missing TEAM_ID'
  end
end