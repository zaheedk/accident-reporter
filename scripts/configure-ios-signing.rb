# Configure only app-owned targets; never apply provisioning profiles to SPM dependencies.
require 'xcodeproj'

project_path = ARGV[0] || 'ios/App/App.xcodeproj'
required = %w[TEAM_ID PROFILE_UUID PROFILE_BUNDLE_ID]
required.each do |name|
  abort "Missing #{name}" if ENV.fetch(name, '').strip.empty?
end

project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |target| target.name == 'App' }
abort 'App target is missing' unless app

# Inherited project-level profiles would also affect future app-owned targets.
project.build_configurations.each do |configuration|
  %w[PROVISIONING_PROFILE PROVISIONING_PROFILE_SPECIFIER].each do |key|
    configuration.build_settings.delete(key)
  end
end

app.build_configurations.each do |configuration|
  settings = configuration.build_settings
  settings['CODE_SIGN_STYLE'] = 'Manual'
  settings['CODE_SIGNING_ALLOWED'] = 'YES'
  settings['CODE_SIGNING_REQUIRED'] = 'YES'
  settings['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = 'Apple Distribution'
  settings['DEVELOPMENT_TEAM'] = ENV.fetch('TEAM_ID')
  settings['PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]'] = ENV.fetch('PROFILE_UUID')
  settings.delete('PROVISIONING_PROFILE_SPECIFIER')
  settings.delete('PROVISIONING_PROFILE')
  settings['PRODUCT_BUNDLE_IDENTIFIER'] = ENV.fetch('PROFILE_BUNDLE_ID')
end

project.save
puts 'Configured manual distribution signing on the App target only'