import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAxios from 'axios-hooks';
import useToast from '../../Utils/UseToast';
import MaterialUploadModal from './MaterialUploadModal';

const StudyMaterialUpload = ({ selectedClass = {}, user = {}, onClose = () => { } }) => {
    const [classSubjects, setClassSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [materialUploadModal, setMaterialUploadModal] = useState(false);
    const [materials, setMaterials] = useState({});  // Store materials by subject ID
    const { addToast, ToastContainer } = useToast();

    // Existing permissions fetch
    const [{ data: permissionsList, loading: permissionsLoading, error: permissionsError }, refetchPermissions] = useAxios(
        `http://localhost:5000/api/permissions?classId=${selectedClass?._id}&teacherId=${user._id}`,
        { manual: true }
    );

    // Fetch materials for a specific subject
    const fetchMaterialsForSubject = async (subjectId) => {
        try {
            const response = await axios.get(`http://localhost:5000/api/materials`, {
                params: {
                    classId: selectedClass._id,
                    teacherId: user._id,
                    subjectId: subjectId
                }
            });
            setMaterials(prev => ({
                ...prev,
                [subjectId]: response.data
            }));
        } catch (error) {
            console.error("Error fetching materials:", error);
            addToast("Error fetching materials: " + error.message, 'error');
        }
    };

    // Existing subjects fetch effect
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                if (selectedClass.subjects && selectedClass.subjects.length > 0) {
                    const response = await axios.get("http://localhost:5000/api/subjects");
                    const fetchedSubjects = response.data;
                    const filteredSubjects = fetchedSubjects.filter(subject =>
                        selectedClass.subjects.includes(subject._id)
                    );
                    setClassSubjects(filteredSubjects);

                    // Fetch materials for each subject
                    filteredSubjects.forEach(subject => {
                        fetchMaterialsForSubject(subject._id);
                    });
                }
            } catch (error) {
                console.error("Error fetching subjects:", error);
            }
        };

        if (selectedClass?._id) {
            fetchSubjects();
            refetchPermissions();
        }
    }, [selectedClass, refetchPermissions]);

    // Handle material deletion
    const handleDeleteMaterial = async (materialId, subjectId) => {
        try {
            await axios.delete(`http://localhost:5000/api/materials/${materialId}`);
            addToast("Material deleted successfully", 'success');
            // Refresh materials for this subject
            fetchMaterialsForSubject(subjectId);
        } catch (error) {
            console.error("Error deleting material:", error);
            addToast("Error deleting material: " + error.message, 'error');
        }
    };

    // Filter subjects based on permissions
    const filteredSubjects = classSubjects?.filter((subject) =>
        permissionsList?.some((permission) =>
            permission.subjectId === subject._id &&
            permission.havePermission === true &&
            permission.teacherId === user._id
        )
    );

    return (
        <section className="p-8 w-5/6 ml-auto mr-10">
            <div className="modal-content flex flex-col h-full">
                <h2 className='2xl:text-3xl xl:text-xl text-base font-semibold mb-6'>Subjects with Upload Permission</h2>
                {permissionsLoading ? (
                    <div>Loading...</div>
                ) : permissionsError ? (
                    <div>Error loading permissions</div>
                ) : classSubjects.length === 0 ? (
                    <div>No subjects available for Study Material upload.</div>
                ) : filteredSubjects?.length === 0 ? (
                    <div>No subjects available for this teacher.</div>
                ) : (
                    <div className="space-y-8">
                        {filteredSubjects?.map((subject) => (
                            <div key={subject._id} className="bg-gray-800 p-6 rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h1 className="font-bold text-xl">
                                        {subject.subjectName}
                                    </h1>
                                    <button
                                        className="btn btn-outline btn-info"
                                        onClick={() => {
                                            setSelectedSubject(subject);
                                            setMaterialUploadModal(true);
                                        }}
                                    >
                                        Upload Material
                                    </button>
                                </div>

                                {/* Materials List */}
                                <div className="mt-4">
                                    <h3 className="text-lg font-semibold mb-2">Uploaded Materials:</h3>
                                    {materials[subject._id]?.length > 0 ? (
                                        <ul className="space-y-2">
                                            {materials[subject._id].map((material) => (
                                                <li key={material._id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                                                    <span>{material.fileName}</span>
                                                    <div className="space-x-2">
                                                        <a
                                                            href={`http://localhost:5000/${material.filePath}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-sm btn-primary"
                                                        >
                                                            Download
                                                        </a>
                                                        <button
                                                            onClick={() => handleDeleteMaterial(material._id, subject._id)}
                                                            className="btn btn-sm btn-error"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-400">No materials uploaded yet.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="modal-action mt-auto">
                    <button onClick={onClose} className="btn btn-default text-xl">
                        Close
                    </button>
                </div>
            </div>

            {materialUploadModal && (
                <MaterialUploadModal
                    selectedClass={selectedClass}
                    selectedSubject={selectedSubject}
                    onClose={() => {
                        setMaterialUploadModal(false);
                        // Refresh materials for the selected subject after upload
                        if (selectedSubject) {
                            fetchMaterialsForSubject(selectedSubject._id);
                        }
                    }}
                    user={user}
                    addToast={addToast}
                />
            )}
            <ToastContainer />
        </section>
    );
};

export default StudyMaterialUpload;