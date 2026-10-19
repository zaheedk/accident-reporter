# Run on macOS after Capacitor has generated the Xcode project.
require 'xcodeproj'
require 'fileutils'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |candidate| candidate.name == 'App' }
abort 'App target is missing' unless target
source = 'resources/ios/PrivacyInfo.xcprivacy'
destination = 'ios/App/App/PrivacyInfo.xcprivacy'
FileUtils.cp(source, destination)
group = project.main_group.find_subpath('App', true)
reference = group.files.find { |file| file.path == 'PrivacyInfo.xcprivacy' }
reference ||= group.new_file('PrivacyInfo.xcprivacy')
unless target.resources_build_phase.files_references.include?(reference)
  target.resources_build_phase.add_file_reference(reference)
end
project.save
puts 'Embedded app privacy manifest in App target resources'